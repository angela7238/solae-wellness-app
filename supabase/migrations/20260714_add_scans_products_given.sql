-- Track which products the coach checked off as "given" to the client at a
-- given visit. Stored per-scan so each visit keeps its own record.
alter table public.scans
  add column if not exists products_given jsonb not null default '[]'::jsonb;
