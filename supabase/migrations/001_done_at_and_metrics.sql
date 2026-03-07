-- ============================================================
-- LifeDesk CRM — Migration 001
-- 1. Add done_at timestamptz to follow_ups
-- 2. Trigger to auto-set / clear done_at on done transitions
-- 3. dashboard_metrics(p_period, p_tz) RPC function
--
-- Run once in Supabase SQL Editor → New query → Run
-- ============================================================

-- ─── 1. done_at column ───────────────────────────────────────
alter table follow_ups
  add column if not exists done_at timestamptz default null;

-- Back-fill: rows already done get done_at = updated_at
update follow_ups
  set done_at = updated_at
  where done = true and done_at is null;

-- ─── 2. Trigger: auto-manage done_at ─────────────────────────
create or replace function fu_set_done_at()
returns trigger language plpgsql as $$
begin
  if new.done = true and (old.done = false or old.done is null) then
    -- transitioning to done → stamp now
    new.done_at := now();
  elsif new.done = false and old.done = true then
    -- un-done → clear the timestamp
    new.done_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists fu_done_at_trigger on follow_ups;
create trigger fu_done_at_trigger
  before update on follow_ups
  for each row execute function fu_set_done_at();

-- ─── 3. dashboard_metrics RPC ────────────────────────────────
--
-- Parameters
--   p_period  : 'day' | 'week' | 'month'
--   p_tz      : any valid Postgres timezone string
--               (default 'America/Los_Angeles')
--
-- Metric definitions
--   new_leads          – leads.created_at within window
--   calls              – call_log.created_at within window
--   contacted_calls    – calls with outcome = 'contacted'
--   followups_created  – follow_ups.created_at within window
--   followups_done     – follow_ups.done_at within window
--   followups_pending  – open follow_ups (done=false), all time
--   followups_overdue  – open follow_ups whose due_date < today (in p_tz)
--   closed_won         – leads.status='Closed Won'
--                        AND leads.updated_at within window
--                        (updated_at is refreshed on every status change)
--   premium_won        – sum(leads.premium) for closed_won within window
--
-- Returns
--   {
--     period: 'day'|'week'|'month',
--     window_start: timestamptz,
--     summary: { new_leads, calls, contacted_calls, followups_created,
--                followups_done, followups_pending, followups_overdue,
--                closed_won, premium_won },
--     series: [ { date, new_leads, calls, followups_created,
--                 followups_done }, … ]
--   }
--
-- Security
--   SECURITY DEFINER so the function can read all rows, but it
--   hard-codes auth.uid() filtering — callers cannot bypass it.
--   search_path is pinned to prevent search-path injection.
-- ─────────────────────────────────────────────────────────────
create or replace function dashboard_metrics(
  p_period text,
  p_tz     text default 'America/Los_Angeles'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid    := auth.uid();
  v_today      date    := (now() at time zone p_tz)::date;
  v_window_start timestamptz;
  v_window_end   timestamptz := now();

  -- summary counters
  v_new_leads         int;
  v_calls             int;
  v_contacted_calls   int;
  v_fu_created        int;
  v_fu_done           int;
  v_fu_pending        int;
  v_fu_overdue        int;
  v_closed_won        int;
  v_premium_won       numeric;

  v_series            json;
begin
  -- Validate period
  if p_period not in ('day','week','month') then
    raise exception 'p_period must be day, week, or month';
  end if;

  -- Validate caller is authenticated
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Compute window start (beginning of the chosen period in p_tz)
  v_window_start := case p_period
    when 'day'   then (v_today::timestamptz at time zone p_tz)
    when 'week'  then ((v_today - (extract(dow from v_today)::int))::timestamptz at time zone p_tz)
    when 'month' then (date_trunc('month', v_today::timestamptz) at time zone p_tz)
  end;

  -- ── Summary metrics ──────────────────────────────────────
  select count(*) into v_new_leads
    from leads
    where agent_id = v_uid
      and created_at >= v_window_start and created_at < v_window_end;

  select count(*) into v_calls
    from call_log
    where agent_id = v_uid
      and created_at >= v_window_start and created_at < v_window_end;

  select count(*) into v_contacted_calls
    from call_log
    where agent_id = v_uid
      and outcome = 'contacted'
      and created_at >= v_window_start and created_at < v_window_end;

  select count(*) into v_fu_created
    from follow_ups
    where agent_id = v_uid
      and created_at >= v_window_start and created_at < v_window_end;

  select count(*) into v_fu_done
    from follow_ups
    where agent_id = v_uid
      and done_at >= v_window_start and done_at < v_window_end;

  select count(*) into v_fu_pending
    from follow_ups
    where agent_id = v_uid
      and done = false;

  select count(*) into v_fu_overdue
    from follow_ups
    where agent_id = v_uid
      and done = false
      and due_date < v_today;

  select count(*), coalesce(sum(premium), 0)
    into v_closed_won, v_premium_won
    from leads
    where agent_id = v_uid
      and status = 'Closed Won'
      and updated_at >= v_window_start and updated_at < v_window_end;

  -- ── Daily series ──────────────────────────────────────────
  -- Generate one row per calendar day in the window (in p_tz).
  select json_agg(row_to_json(ds) order by ds.date)
    into v_series
    from (
      select
        d.date::text                                                        as date,
        count(distinct lx.id)                                               as new_leads,
        count(distinct cl.id)                                               as calls,
        count(distinct fx.id)                                               as followups_created,
        count(distinct fd.id)                                               as followups_done
      from
        generate_series(
          (v_window_start at time zone p_tz)::date,
          (v_window_end   at time zone p_tz)::date,
          interval '1 day'
        ) as d(date)
        left join leads lx
          on  lx.agent_id = v_uid
          and (lx.created_at at time zone p_tz)::date = d.date
        left join call_log cl
          on  cl.agent_id = v_uid
          and (cl.created_at at time zone p_tz)::date = d.date
        left join follow_ups fx
          on  fx.agent_id = v_uid
          and (fx.created_at at time zone p_tz)::date = d.date
        left join follow_ups fd
          on  fd.agent_id = v_uid
          and fd.done_at is not null
          and (fd.done_at at time zone p_tz)::date = d.date
      group by d.date
    ) ds;

  -- ── Return JSON ───────────────────────────────────────────
  return json_build_object(
    'period',       p_period,
    'window_start', v_window_start,
    'summary', json_build_object(
      'new_leads',         v_new_leads,
      'calls',             v_calls,
      'contacted_calls',   v_contacted_calls,
      'followups_created', v_fu_created,
      'followups_done',    v_fu_done,
      'followups_pending', v_fu_pending,
      'followups_overdue', v_fu_overdue,
      'closed_won',        v_closed_won,
      'premium_won',       v_premium_won
    ),
    'series', coalesce(v_series, '[]'::json)
  );
end;
$$;

-- Grant execute to authenticated users only
revoke all on function dashboard_metrics(text, text) from public;
grant execute on function dashboard_metrics(text, text) to authenticated;
