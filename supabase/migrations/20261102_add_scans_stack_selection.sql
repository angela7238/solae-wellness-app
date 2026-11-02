-- Wellness Stack Selector (Phase 1): store the chosen wellness goal + profile
-- filters (e.g. eating pattern) per visit, so suggestions persist.
alter table public.scans
  add column if not exists stack_selection jsonb;
