-- ============================================================
-- LifeDesk CRM — Migration 002
-- Adds pipeline_value, deals_lost, total_leads, and
-- conversion_rate to dashboard_metrics RPC
--
-- New metrics:
--   pipeline_value   – sum(premium) for leads whose status is not
--                      'Closed Won' or 'Closed Lost' (active pipeline,
--                      all time)
--   deals_lost       – leads where status = 'Closed Lost' AND
--                      updated_at within the window
--   total_leads      – total leads for the agent (all time)
--   conversion_rate  – integer percentage: closed_won (period) /
--                      total_leads (all time) × 100
--
-- Run once in Supabase SQL Editor → New query → Run
-- ============================================================

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
  v_pipeline_value    numeric;
  v_deals_lost        int;
  v_total_leads       int;

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

  -- Active pipeline value: sum of premiums for non-closed leads (all time)
  select coalesce(sum(premium), 0)
    into v_pipeline_value
    from leads
    where agent_id = v_uid
      and status not in ('Closed Won', 'Closed Lost');

  -- Deals lost within the window
  select count(*)
    into v_deals_lost
    from leads
    where agent_id = v_uid
      and status = 'Closed Lost'
      and updated_at >= v_window_start and updated_at < v_window_end;

  -- Total leads all time (used as denominator for conversion rate)
  select count(*)
    into v_total_leads
    from leads
    where agent_id = v_uid;

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
      'premium_won',       v_premium_won,
      'pipeline_value',    v_pipeline_value,
      'deals_lost',        v_deals_lost,
      'total_leads',       v_total_leads,
      'conversion_rate',   case when v_total_leads > 0
                             then round((v_closed_won::numeric / v_total_leads) * 100)
                             else 0
                           end
    ),
    'series', coalesce(v_series, '[]'::json)
  );
end;
$$;

-- Grant execute to authenticated users only
revoke all on function dashboard_metrics(text, text) from public;
grant execute on function dashboard_metrics(text, text) to authenticated;
