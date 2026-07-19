-- Run this migration once in the Supabase SQL Editor for an existing LinkUp database.
begin;

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'shad' check (role in ('shad', 'pa', 'lt'))
);

insert into public.user_roles (user_id, role)
select id, 'shad' from public.profiles
on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'New participant'));
  insert into public.user_roles (user_id, role) values (new.id, 'shad');
  return new;
end;
$$;

alter table public.user_roles enable row level security;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role in ('pa', 'lt'));
$$;
create or replace function public.is_lt()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'lt');
$$;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_lt() to authenticated;

revoke all on public.user_roles from anon;
grant select on public.user_roles to authenticated;
grant update(role) on public.user_roles to authenticated;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Authenticated users can view memberships" on public.team_memberships;
drop policy if exists "Users view self and staff view roster" on public.profiles;
drop policy if exists "Users view own memberships and staff view roster" on public.team_memberships;
drop policy if exists "Users view own role and staff view roles" on public.user_roles;
drop policy if exists "LT manages other user roles" on public.user_roles;

create policy "Users view self and staff view roster" on public.profiles
for select to authenticated using ((select auth.uid()) = id or (select public.is_staff()));
create policy "Users view own memberships and staff view roster" on public.team_memberships
for select to authenticated using ((select auth.uid()) = user_id or (select public.is_staff()));
create policy "Users view own role and staff view roles" on public.user_roles
for select to authenticated using ((select auth.uid()) = user_id or (select public.is_staff()));
create policy "LT manages other user roles" on public.user_roles
for update to authenticated using ((select public.is_lt()) and user_id <> (select auth.uid()))
with check ((select public.is_lt()) and user_id <> (select auth.uid()));

-- Team creation/update/deletion stays unavailable to every browser account.
revoke insert, update, delete on public.teams from authenticated;

-- Replace prototype teams with the fixed 11 + 11 official slots.
delete from public.team_memberships;
delete from public.teams;
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
  ('Design Team 11', 'design', '#c0392b');

commit;
