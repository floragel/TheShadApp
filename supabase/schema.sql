-- Run this once in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  bio text not null default '' check (char_length(bio) <= 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('house', 'design')),
  color text not null default '#6d3df5' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  unique (name, kind),
  unique (id, kind)
);

create table if not exists public.team_memberships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null,
  team_kind text not null check (team_kind in ('house', 'design')),
  joined_at timestamptz not null default now(),
  primary key (user_id, team_id),
  unique (user_id, team_kind),
  foreign key (team_id, team_kind) references public.teams(id, kind) on delete cascade
);

create index if not exists team_memberships_user_id_idx on public.team_memberships(user_id);
create index if not exists team_memberships_team_id_idx on public.team_memberships(team_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'New participant'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;

revoke all on public.profiles, public.teams, public.team_memberships from anon;
grant select, update on public.profiles to authenticated;
grant select on public.teams to authenticated;
grant select, insert, delete on public.team_memberships to authenticated;

create policy "Authenticated users can view profiles" on public.profiles
for select to authenticated using (true);
create policy "Users update only their profile" on public.profiles
for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Authenticated users can view teams" on public.teams
for select to authenticated using (true);
create policy "Authenticated users can view memberships" on public.team_memberships
for select to authenticated using (true);
create policy "Users join only themselves" on public.team_memberships
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users leave only their memberships" on public.team_memberships
for delete to authenticated using ((select auth.uid()) = user_id);

insert into public.teams (name, kind, color) values
  ('House Purple', 'house', '#6d3df5'),
  ('House Blue', 'house', '#3788e5'),
  ('House Green', 'house', '#38a875'),
  ('House Gold', 'house', '#e3a72f'),
  ('Design Team 1', 'design', '#ec6a8d'),
  ('Design Team 2', 'design', '#6d3df5'),
  ('Design Team 3', 'design', '#319caa'),
  ('Design Team 4', 'design', '#e58a36')
on conflict (name, kind) do nothing;
