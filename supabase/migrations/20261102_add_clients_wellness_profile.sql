-- Phase 2: client standing wellness profile (eating pattern, hormonal stage,
-- exercise status) — set once, reused across the client's visits.
alter table public.clients
  add column if not exists wellness_profile jsonb;
