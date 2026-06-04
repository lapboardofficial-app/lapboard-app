create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 40),
  city text default '',
  bio text default 'Karting profile',
  avatar_url text default '',
  home_track_id text default '',
  kart_experience text default 'casual',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.laps (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  player text not null,
  track_id text not null,
  layout text not null default 'Main layout',
  kart text default '',
  ms integer not null check (ms > 0),
  lap_date date not null default current_date,
  lap_number integer,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  owner text not null,
  title text not null,
  url text not null check (url ~* '^https?://'),
  type text not null default 'link',
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  owner text not null,
  name text not null unique,
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id text not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  player text not null,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.league_memberships (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  player text not null,
  league_id text not null,
  track_id text not null,
  joined_at date not null default current_date,
  unique (user_id, league_id, track_id)
);

create index if not exists laps_track_layout_ms_idx on public.laps (track_id, layout, ms);
create index if not exists laps_user_id_idx on public.laps (user_id);
create index if not exists media_entries_user_id_idx on public.media_entries (user_id);
create index if not exists teams_owner_user_id_idx on public.teams (owner_user_id);
create index if not exists team_members_user_id_idx on public.team_members (user_id);
create index if not exists league_memberships_user_id_idx on public.league_memberships (user_id);

alter table public.profiles enable row level security;
alter table public.laps enable row level security;
alter table public.media_entries enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.league_memberships enable row level security;

create policy "Profiles are visible to everyone"
on public.profiles for select
to anon, authenticated
using (true);

create policy "Users insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Public laps are visible and own private laps are visible"
on public.laps for select
to anon, authenticated
using (visibility = 'public' or (select auth.uid()) = user_id);

create policy "Users insert their own laps"
on public.laps for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their own laps"
on public.laps for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete their own laps"
on public.laps for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Media entries are visible to everyone"
on public.media_entries for select
to anon, authenticated
using (true);

create policy "Users insert their own media"
on public.media_entries for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their own media"
on public.media_entries for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete their own media"
on public.media_entries for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Teams are visible to everyone"
on public.teams for select
to anon, authenticated
using (true);

create policy "Users create their own teams"
on public.teams for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

create policy "Owners update their teams"
on public.teams for update
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy "Owners delete their teams"
on public.teams for delete
to authenticated
using ((select auth.uid()) = owner_user_id);

create policy "Team members are visible to everyone"
on public.team_members for select
to anon, authenticated
using (true);

create policy "Users join as themselves"
on public.team_members for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users leave teams themselves"
on public.team_members for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "League memberships are visible to everyone"
on public.league_memberships for select
to anon, authenticated
using (true);

create policy "Users insert their own league memberships"
on public.league_memberships for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their own league memberships"
on public.league_memberships for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete their own league memberships"
on public.league_memberships for delete
to authenticated
using ((select auth.uid()) = user_id);
