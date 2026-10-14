-- Additive: run after existing migrations. No public database access is granted.
create table if not exists public.guide_access (
  client_id uuid primary key references public.clients(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.guide_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  scan_id uuid not null unique references public.scans(id) on delete cascade,
  previous_scan_id uuid references public.scans(id) on delete cascade,
  draft_content jsonb not null,
  published_content jsonb,
  approved_at timestamptz,
  notification_status text not null default 'pending' check (notification_status in ('pending','sending','sent','failed')),
  notification_claimed_at timestamptz,
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.guide_access enable row level security;
alter table public.guide_reports enable row level security;
revoke all on public.guide_access, public.guide_reports from anon, authenticated;
grant all on public.guide_access, public.guide_reports to service_role;

-- Enrollment is explicit and only callable by the studio's server.
create or replace function public.enroll_guide_client(p_client_id uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare user_id uuid;
begin
  select id into user_id from auth.users where lower(email) = lower(trim(p_email));
  if user_id is null then raise exception 'Auth account not found'; end if;
  insert into public.guide_access(client_id,auth_user_id,email)
    values(p_client_id,user_id,lower(trim(p_email)))
    on conflict(client_id) do update set auth_user_id=excluded.auth_user_id,email=excluded.email;
end;
$$;
revoke all on function public.enroll_guide_client(uuid,text) from public,anon,authenticated;
grant execute on function public.enroll_guide_client(uuid,text) to service_role;

-- Optimistic revision check: never publish over another reviewer's edits.
create or replace function public.publish_guide_report(p_id uuid, p_revision integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.guide_reports set published_content=draft_content,approved_at=now(),
    notification_status='pending',notification_claimed_at=null,revision=revision+1,updated_at=now()
    where id=p_id and revision=p_revision and draft_content->>'text' <> '';
  return found;
end;
$$;
revoke all on function public.publish_guide_report(uuid,integer) from public,anon,authenticated;
grant execute on function public.publish_guide_report(uuid,integer) to service_role;

-- An edited/replaced source invalidates its own and dependent published summaries.
create or replace function public.invalidate_guide_reports()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.parsed_data is distinct from new.parsed_data or old.scan_date is distinct from new.scan_date or old.client_id is distinct from new.client_id then
    delete from public.guide_reports where scan_id=old.id or previous_scan_id=old.id;
  end if;
  return new;
end;
$$;
revoke all on function public.invalidate_guide_reports() from public,anon,authenticated;
drop trigger if exists invalidate_guide_reports on public.scans;
create trigger invalidate_guide_reports before update on public.scans
for each row execute function public.invalidate_guide_reports();

-- A backdated import changes which scan is the immediate predecessor.
create or replace function public.invalidate_successor_guide_report()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guide_reports where scan_id = (
    select id from public.scans where client_id=new.client_id and scan_date>new.scan_date
    order by scan_date limit 1
  );
  return new;
end;
$$;
revoke all on function public.invalidate_successor_guide_report() from public,anon,authenticated;
drop trigger if exists invalidate_successor_guide_report on public.scans;
create trigger invalidate_successor_guide_report after insert on public.scans
for each row execute function public.invalidate_successor_guide_report();
