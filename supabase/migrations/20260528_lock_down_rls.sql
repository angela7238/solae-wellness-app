-- Lock down RLS — remove public (anon) access to client health data.
--
-- Context: previously all three tables granted the `anon` role unrestricted
-- read/write/delete via `using (true) with check (true)`. Because the anon key
-- is a NEXT_PUBLIC_ (browser-exposed) key, that meant anyone who loaded the site
-- could read or delete every client's data.
--
-- After this migration the server uses the secret service-role key (set via
-- SUPABASE_SERVICE_ROLE_KEY), which bypasses RLS. The browser only ever calls
-- our own Next.js API routes, never Supabase directly, so removing anon access
-- does not affect the app.
--
-- PREREQUISITE: SUPABASE_SERVICE_ROLE_KEY must already be set in production
-- (Netlify) and deployed BEFORE running this. Otherwise the live app will lose
-- database access.

drop policy if exists clients_anon_all   on public.clients;
drop policy if exists scans_anon_all     on public.scans;
drop policy if exists supp_eval_anon_all on public.supplement_evaluations;

-- RLS stays enabled on all three tables. With no policy granting the anon role
-- access, anon is denied by default. No new policies are required because
-- service_role bypasses RLS entirely.
alter table public.clients                enable row level security;
alter table public.scans                  enable row level security;
alter table public.supplement_evaluations enable row level security;
