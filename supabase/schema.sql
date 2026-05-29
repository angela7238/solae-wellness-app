-- Solae Wellness Scan App — initial schema
-- Run this in Supabase Studio → SQL Editor → New query → paste → Run.
-- Idempotent: safe to run multiple times.

create extension if not exists "uuid-ossp";

-- ============================================
-- clients
-- ============================================
create table if not exists public.clients (
  id                       uuid primary key default uuid_generate_v4(),
  name                     text not null,
  age                      int,
  sex                      text,
  email                    text,
  current_solae_stack      jsonb default '{"detox":[],"repair":[],"restore":[],"nourish":[]}'::jsonb,
  non_solae_supplements    jsonb default '{"omega3":false,"berberine":false,"cinnamon":false,"glutathione":false,"multivitamin":false,"other":""}'::jsonb,
  goals                    text,
  notes                    text,
  created_at               timestamptz not null default now()
);

create index if not exists clients_name_idx on public.clients (lower(name));

-- ============================================
-- scans
-- ============================================
create table if not exists public.scans (
  id                       uuid primary key default uuid_generate_v4(),
  client_id                uuid not null references public.clients(id) on delete cascade,
  scan_date                date not null,
  parsed_data              jsonb not null,
  notes                    text,
  uploaded_at              timestamptz not null default now()
);

-- Migration: add notes column if upgrading from an older schema
alter table public.scans add column if not exists notes text;

create index if not exists scans_client_id_idx on public.scans (client_id);
create index if not exists scans_client_date_idx on public.scans (client_id, scan_date desc);

-- A client should only have one scan per date — re-uploading the same PDF
-- updates the existing row instead of creating a duplicate.
create unique index if not exists scans_client_scan_date_uniq
  on public.scans (client_id, scan_date);

-- ============================================
-- supplement_evaluations
-- ============================================
create table if not exists public.supplement_evaluations (
  id                       uuid primary key default uuid_generate_v4(),
  client_id                uuid not null references public.clients(id) on delete cascade,
  product_name             text,
  brand_name               text,
  evaluation               jsonb not null,
  created_at               timestamptz not null default now()
);

create index if not exists supp_eval_client_idx on public.supplement_evaluations (client_id);
create index if not exists supp_eval_created_idx on public.supplement_evaluations (client_id, created_at desc);

-- Migration: run this if upgrading from older schema
alter table public.supplement_evaluations add column if not exists brand_name text;

-- ============================================
-- Row-Level Security
-- ============================================
-- RLS is enabled with NO anon policies. The server accesses the database with
-- the secret service-role key (SUPABASE_SERVICE_ROLE_KEY), which bypasses RLS.
-- The browser never talks to Supabase directly — it only calls our Next.js API
-- routes — so the anon role needs no access. Denying anon closes public access
-- to client health data.
alter table public.clients                enable row level security;
alter table public.scans                  enable row level security;
alter table public.supplement_evaluations enable row level security;

-- Remove any legacy permissive anon policies (safe if they don't exist).
drop policy if exists clients_anon_all   on public.clients;
drop policy if exists scans_anon_all     on public.scans;
drop policy if exists supp_eval_anon_all on public.supplement_evaluations;
