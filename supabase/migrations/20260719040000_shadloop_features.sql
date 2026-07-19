-- Migration: ShadLoop new features
-- Waiting lists, polls, absences, lateness, and activity attendance confirmation

begin;

-- 1. Alter activity_members to support attendance confirmation
alter table public.activity_members add column if not exists confirmed_at timestamptz;

-- 2. Create waiting list table
create table if not exists public.activity_waiting_list (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(activity_id, user_id)
);

-- 3. Create polls / surveys table
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options text[] not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 4. Create poll votes table
create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index int not null,
  created_at timestamptz not null default now(),
  primary key(poll_id, user_id)
);

-- 5. Create absence & lateness reports table
create table if not exists public.attendance_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('absence', 'lateness')),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  starts_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Enable RLS and set policies
alter table public.activity_waiting_list enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.attendance_reports enable row level security;

grant select, insert, delete on public.activity_waiting_list to authenticated;
grant select, insert, update, delete on public.polls to authenticated;
grant select, insert, update on public.poll_votes to authenticated;
grant select, insert, update on public.attendance_reports to authenticated;

-- Policies
drop policy if exists "community reads waiting lists" on public.activity_waiting_list;
create policy "community reads waiting lists" on public.activity_waiting_list for select to authenticated using(true);

drop policy if exists "users join waiting list" on public.activity_waiting_list;
create policy "users join waiting list" on public.activity_waiting_list for insert to authenticated with check(user_id = auth.uid());

drop policy if exists "users leave waiting list" on public.activity_waiting_list;
create policy "users leave waiting list" on public.activity_waiting_list for delete to authenticated using(user_id = auth.uid() or (select public.is_staff()));

drop policy if exists "community reads polls" on public.polls;
create policy "community reads polls" on public.polls for select to authenticated using(true);

drop policy if exists "staff manages polls" on public.polls;
create policy "staff manages polls" on public.polls for all to authenticated using((select public.is_staff())) with check((select public.is_staff()));

drop policy if exists "community reads votes" on public.poll_votes;
create policy "community reads votes" on public.poll_votes for select to authenticated using(true);

drop policy if exists "users vote" on public.poll_votes;
create policy "users vote" on public.poll_votes for insert to authenticated with check(user_id = auth.uid());

drop policy if exists "users read own reports and staff reads all" on public.attendance_reports;
create policy "users read own reports and staff reads all" on public.attendance_reports for select to authenticated using(user_id = auth.uid() or (select public.is_staff()));

drop policy if exists "users create reports" on public.attendance_reports;
create policy "users create reports" on public.attendance_reports for insert to authenticated with check(user_id = auth.uid());

drop policy if exists "staff manages reports" on public.attendance_reports;
create policy "staff manages reports" on public.attendance_reports for update to authenticated using((select public.is_staff())) with check((select public.is_staff()));

commit;
