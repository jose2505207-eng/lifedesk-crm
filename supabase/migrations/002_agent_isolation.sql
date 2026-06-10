-- ============================================================
-- Migration 002 — Aislamiento por agente (RLS estricto)
-- Ejecutar DESPUÉS de schema.sql y 001_done_at_and_metrics.sql
--
-- Qué hace:
--   1. agent_id se llena solo con el usuario autenticado (default auth.uid())
--   2. Elimina las políticas de desarrollo (acceso total)
--   3. Crea políticas estrictas: cada agente ve SOLO sus datos
--
-- ⚠️ ANTES DE CORRER: si ya tienes leads sin agent_id (datos de
-- desarrollo), asígnalos a tu usuario o bórralos, porque dejarán
-- de ser visibles con RLS estricto:
--
--   -- Ver tu user id:    select id, email from auth.users;
--   -- Asignar huérfanos: update leads      set agent_id = 'TU-USER-UUID' where agent_id is null;
--   --                    update follow_ups set agent_id = 'TU-USER-UUID' where agent_id is null;
--   --                    update call_log   set agent_id = 'TU-USER-UUID' where agent_id is null;
-- ============================================================

-- ─── 1. agent_id automático en inserts ──────────────────────
alter table leads      alter column agent_id set default auth.uid();
alter table follow_ups alter column agent_id set default auth.uid();
alter table call_log   alter column agent_id set default auth.uid();

-- ─── 2. Quitar políticas de desarrollo ───────────────────────
drop policy if exists "dev_all_leads"   on leads;
drop policy if exists "dev_all_fu"      on follow_ups;
drop policy if exists "dev_all_calllog" on call_log;

-- ─── 3. Políticas estrictas por agente ───────────────────────
drop policy if exists "agent_leads"   on leads;
drop policy if exists "agent_fu"      on follow_ups;
drop policy if exists "agent_calllog" on call_log;

create policy "agent_leads" on leads
  for all
  using      (auth.uid() = agent_id)
  with check (auth.uid() = agent_id);

create policy "agent_fu" on follow_ups
  for all
  using      (auth.uid() = agent_id)
  with check (auth.uid() = agent_id);

create policy "agent_calllog" on call_log
  for all
  using      (auth.uid() = agent_id)
  with check (auth.uid() = agent_id);

-- ─── 4. follow_ups debe pertenecer a un lead del mismo agente ─
-- (defensa extra: evita crear follow-ups apuntando a leads ajenos)
create or replace function check_fu_lead_owner()
returns trigger language plpgsql security definer as $$
begin
  if not exists (
    select 1 from leads
    where id = new.lead_id and agent_id = new.agent_id
  ) then
    raise exception 'lead does not belong to this agent';
  end if;
  return new;
end;
$$;

create or replace trigger fu_lead_owner
  before insert or update of lead_id on follow_ups
  for each row execute function check_fu_lead_owner();
