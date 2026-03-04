-- ============================================================
-- LifeDesk CRM — Supabase Schema
-- Pega este archivo completo en el SQL Editor de Supabase
-- y haz clic en "Run"
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Leads ──────────────────────────────────────────────────
create table if not exists leads (
  id           uuid primary key default uuid_generate_v4(),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),

  -- Datos básicos
  name         text        not null,
  phone        text        not null,
  email        text,
  city         text,
  age          integer,

  -- CRM
  status       text        not null default 'New Lead'
                           check (status in (
                             'New Lead','Contacted','Quoted',
                             'Follow-Up','Closed Won','Closed Lost'
                           )),
  product      text        not null default 'Term Life',
  premium      numeric     default 0,
  notes        text        default '',
  last_contact date        default current_date,

  -- Multi-agente (para cuando agregues auth)
  agent_id     uuid        references auth.users(id) on delete cascade
);

-- Índices útiles
create index if not exists leads_status_idx on leads(status);
create index if not exists leads_agent_idx  on leads(agent_id);

-- ─── Follow-ups ──────────────────────────────────────────────
create table if not exists follow_ups (
  id         uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  lead_id    uuid        not null references leads(id) on delete cascade,
  agent_id   uuid        references auth.users(id) on delete cascade,

  note       text        not null,
  due_date   date        not null,
  done       boolean     not null default false
);

create index if not exists fu_lead_idx  on follow_ups(lead_id);
create index if not exists fu_done_idx  on follow_ups(done);
create index if not exists fu_agent_idx on follow_ups(agent_id);

-- ─── Call Log ────────────────────────────────────────────────
create table if not exists call_log (
  id           uuid primary key default uuid_generate_v4(),
  created_at   timestamptz default now(),

  lead_id      uuid        not null references leads(id) on delete cascade,
  agent_id     uuid        references auth.users(id) on delete cascade,

  outcome      text        not null
                           check (outcome in ('contacted','no-answer','dropped')),
  duration_sec integer     default 0,
  from_number  text,             -- número Twilio local usado
  notes        text
);

create index if not exists calllog_lead_idx  on call_log(lead_id);
create index if not exists calllog_agent_idx on call_log(agent_id);

-- ─── Trigger: updated_at automático ─────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

create or replace trigger fu_updated_at
  before update on follow_ups
  for each row execute function update_updated_at();

-- ─── Row Level Security (RLS) ────────────────────────────────
-- Activa RLS en todas las tablas
alter table leads    enable row level security;
alter table follow_ups enable row level security;
alter table call_log  enable row level security;

-- OPCIÓN A: Sin auth todavía — acceso total (para desarrollo)
-- Descomenta estas líneas mientras construyes sin login:
create policy "dev_all_leads"    on leads      for all using (true) with check (true);
create policy "dev_all_fu"       on follow_ups for all using (true) with check (true);
create policy "dev_all_calllog"  on call_log   for all using (true) with check (true);

-- OPCIÓN B: Con auth — cada agente ve solo sus datos
-- (Comenta las 3 de arriba y descomenta estas cuando agregues login)
-- create policy "agent_leads"   on leads      for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);
-- create policy "agent_fu"      on follow_ups for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);
-- create policy "agent_calllog" on call_log   for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

-- ─── Datos de prueba (opcional) ─────────────────────────────
-- Descomenta para insertar los leads de ejemplo:
/*
insert into leads (name, phone, email, city, age, status, product, premium, notes, last_contact) values
  ('Maria Garcia',  '408-555-0101', 'maria@email.com',   'San Jose',      34, 'New Lead',   'Term Life',    0,   'Referred by Carlos. Family of 4.', '2026-02-28'),
  ('Robert Chen',   '415-555-0192', 'rchen@email.com',   'San Francisco', 42, 'Quoted',     'Whole Life',   480, '$500k policy. Non-smoker.',        '2026-03-01'),
  ('Ana Lopez',     '650-555-0143', 'alopez@email.com',  'Redwood City',  67, 'Follow-Up',  'Final Expense', 89, 'Widow. $15k policy.',              '2026-03-02'),
  ('James Miller',  '510-555-0177', 'jmiller@email.com', 'Oakland',       48, 'Contacted',  'IUL',          0,   'Business owner. Tax-adv.',         '2026-03-03'),
  ('Sofia Reyes',   '707-555-0166', 'sreyes@email.com',  'Napa',          29, 'Closed Won', 'Term Life',    220, '20yr $250k signed 3/1.',           '2026-03-01');
*/
