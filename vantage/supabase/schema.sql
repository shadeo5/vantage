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

-- ── Content: cities + spots (per the CONTENT_PIPELINE ADR) ───────────────────
-- Public, read-only reference content produced by the content pipeline (curate →
-- vet → draft). Written by the pipeline via the SQL editor / service_role; readable
-- by everyone (anonymous auth included) once published. `genres` is multi-genre,
-- primary first. No PostGIS yet — the app filters client-side.
create table if not exists public.cities (
  id          text primary key,               -- slug: 'nashville', 'atlanta'
  name        text not null,
  region      text,
  center_lat  double precision,
  center_lon  double precision,
  published   boolean not null default false
);

create table if not exists public.spots (
  id           text primary key,              -- slug from the spot name
  city_id      text not null references public.cities(id) on delete cascade,
  name         text not null,
  type         text,                          -- display label: Cityscape, Street art, …
  genres       text[] not null default '{}',  -- multi-genre, primary first (gear-fit reads genres[1])
  window_type  text,                          -- 'golden' | 'blue' | 'flat'
  reason       text,
  tagline      text,
  why          text,
  look         text[] not null default '{}',  -- the 3 "what to look for" tips
  getting      text,
  image_url    text,                          -- → Supabase Storage (populated in the Image slice)
  lat          double precision,
  lon          double precision,
  published    boolean not null default false
);

create index if not exists spots_city_idx on public.spots (city_id);

alter table public.cities enable row level security;
alter table public.spots  enable row level security;

-- Public read of published rows only (drafts stay hidden until flipped published).
create policy "Anyone can read published cities"
  on public.cities for select using (published);
create policy "Anyone can read published spots"
  on public.spots for select using (published);
