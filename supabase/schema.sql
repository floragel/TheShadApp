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

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'shad' check (role in ('shad', 'pa', 'lt'))
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
  insert into public.user_roles (user_id, role) values (new.id, 'shad');
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
alter table public.user_roles enable row level security;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role in ('pa', 'lt')); $$;

create or replace function public.is_lt()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'lt'); $$;

grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_lt() to authenticated;

revoke all on public.profiles, public.teams, public.team_memberships, public.user_roles from anon;
grant select, update on public.profiles to authenticated;
grant select on public.teams to authenticated;
grant select, insert, delete on public.team_memberships to authenticated;
grant select on public.user_roles to authenticated;
grant update(role) on public.user_roles to authenticated;

create policy "Users view self and staff view roster" on public.profiles
for select to authenticated using ((select auth.uid()) = id or (select public.is_staff()));
create policy "Users update only their profile" on public.profiles
for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Authenticated users can view teams" on public.teams
for select to authenticated using (true);
create policy "Users view own memberships and staff view roster" on public.team_memberships
for select to authenticated using ((select auth.uid()) = user_id or (select public.is_staff()));
create policy "Users join only themselves" on public.team_memberships
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users leave only their memberships" on public.team_memberships
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users view own role and staff view roles" on public.user_roles
for select to authenticated using ((select auth.uid()) = user_id or (select public.is_staff()));
create policy "LT manages other user roles" on public.user_roles
for update to authenticated using ((select public.is_lt()) and user_id <> (select auth.uid()))
with check ((select public.is_lt()) and user_id <> (select auth.uid()));

insert into public.teams (name, kind, color) values
  ('House Team 1', 'house', '#6d3df5'), ('House Team 2', 'house', '#3788e5'),
  ('House Team 3', 'house', '#38a875'), ('House Team 4', 'house', '#e3a72f'),
  ('House Team 5', 'house', '#ec6a8d'), ('House Team 6', 'house', '#319caa'),
  ('House Team 7', 'house', '#e58a36'), ('House Team 8', 'house', '#9b59b6'),
  ('House Team 9', 'house', '#34495e'), ('House Team 10', 'house', '#16a085'),
  ('House Team 11', 'house', '#c0392b'),
  ('Design Team 1', 'design', '#ec6a8d'), ('Design Team 2', 'design', '#6d3df5'),
  ('Design Team 3', 'design', '#319caa'), ('Design Team 4', 'design', '#e58a36'),
  ('Design Team 5', 'design', '#3788e5'), ('Design Team 6', 'design', '#38a875'),
  ('Design Team 7', 'design', '#e3a72f'), ('Design Team 8', 'design', '#9b59b6'),
  ('Design Team 9', 'design', '#34495e'), ('Design Team 10', 'design', '#16a085'),
  ('Design Team 11', 'design', '#c0392b')
on conflict (name, kind) do nothing;
