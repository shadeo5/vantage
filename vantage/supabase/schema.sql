-- Vantage — database schema.  Run once in Supabase → SQL Editor → New query → Run.
--
-- Security model (per PUSH_ARCHITECTURE ADR): anonymous sign-in gives each device
-- a Supabase auth user; Row Level Security scopes every row to that auth.uid().
-- The push edge function uses the service_role key (which bypasses RLS) to read
-- all profiles and send the nightly nudges.

-- One row per device/user, keyed to the anonymous auth user.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  push_token  text,
  timezone    text,
  camera_id   text,
  lens_ids    text[] not null default '{}',
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users manage their own profile"
  on public.profiles for all
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Nudge history — dedupe (don't headline the same spot twice) and measure.
-- Written by the edge function (service_role bypasses RLS); users read their own.
create table if not exists public.nudge_log (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  spot_id   text not null,
  sent_at   timestamptz not null default now()
);

alter table public.nudge_log enable row level security;

create policy "Users read their own nudge log"
  on public.nudge_log for select
  using ((select auth.uid()) = user_id);
