-- Migración 003 — Columna source (origen del lead)
-- Requerida por la extensión y el dashboard del dueño.
-- Ejecutar DESPUÉS de 002_agent_isolation.sql
alter table leads add column if not exists source text default 'Manual';
create index if not exists leads_source_idx on leads (source);
