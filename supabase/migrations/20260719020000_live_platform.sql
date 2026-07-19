begin;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80), description text not null default '' check (char_length(description) <= 280),
  category text not null check (category in ('Active','Chill','Food','Creative')), starts_at timestamptz not null,
  ends_at timestamptz not null, location text not null check (char_length(location) between 2 and 100), capacity int not null check (capacity between 2 and 100),
  created_at timestamptz not null default now(), check (ends_at > starts_at)
);
create table if not exists public.activity_members (
  activity_id uuid references public.activities(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(), primary key(activity_id,user_id)
);
create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(), title text not null, description text not null default '', starts_at timestamptz not null,
  ends_at timestamptz not null, location text not null default '', audience text not null default 'all' check(audience in ('all','shad','pa','lt')),
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), check(ends_at > starts_at)
);
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(), title text not null, body text not null, priority text not null default 'normal' check(priority in ('normal','important','urgent')),
  audience text not null default 'all' check(audience in ('all','shad','pa','lt')), created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.team_pa_assignments (
  team_id uuid primary key references public.teams(id) on delete cascade, pa_user_id uuid not null references public.user_roles(user_id) on delete restrict,
  assigned_by uuid not null references public.profiles(id), assigned_at timestamptz not null default now()
);
create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade, used_on date not null default current_date,
  request_count int not null default 0 check(request_count between 0 and 10), primary key(user_id,used_on)
);

alter table public.activities enable row level security; alter table public.activity_members enable row level security;
alter table public.schedule_events enable row level security; alter table public.announcements enable row level security;
alter table public.team_pa_assignments enable row level security; alter table public.ai_usage enable row level security;
grant select,insert,update,delete on public.activities,public.activity_members to authenticated;
grant select on public.schedule_events,public.announcements,public.team_pa_assignments to authenticated;
grant insert,update,delete on public.schedule_events,public.announcements to authenticated;
grant insert,update,delete on public.team_pa_assignments to authenticated;
revoke all on public.ai_usage from anon,authenticated;

create policy "community reads activities" on public.activities for select to authenticated using(true);
create policy "users create activities" on public.activities for insert to authenticated with check(creator_id=(select auth.uid()));
create policy "creators manage activities" on public.activities for update to authenticated using(creator_id=(select auth.uid()) or (select public.is_staff()));
create policy "creators delete activities" on public.activities for delete to authenticated using(creator_id=(select auth.uid()) or (select public.is_staff()));
create policy "community reads members" on public.activity_members for select to authenticated using(true);
create policy "users join themselves" on public.activity_members for insert to authenticated with check(user_id=(select auth.uid()));
create policy "users leave themselves" on public.activity_members for delete to authenticated using(user_id=(select auth.uid()));
create policy "community reads schedule" on public.schedule_events for select to authenticated using(true);
create policy "staff creates schedule" on public.schedule_events for insert to authenticated with check((select public.is_staff()) and created_by=(select auth.uid()));
create policy "staff updates schedule" on public.schedule_events for update to authenticated using((select public.is_staff()));
create policy "staff deletes schedule" on public.schedule_events for delete to authenticated using((select public.is_staff()));
create policy "community reads announcements" on public.announcements for select to authenticated using(true);
create policy "staff creates announcements" on public.announcements for insert to authenticated with check((select public.is_staff()) and created_by=(select auth.uid()));
create policy "staff updates announcements" on public.announcements for update to authenticated using((select public.is_staff()));
create policy "staff deletes announcements" on public.announcements for delete to authenticated using((select public.is_staff()));
create policy "community reads PA assignments" on public.team_pa_assignments for select to authenticated using(true);
create policy "LT assigns PAs" on public.team_pa_assignments for all to authenticated using((select public.is_lt())) with check((select public.is_lt()));

create or replace function public.consume_ai_quota()
returns int language plpgsql security definer set search_path='' as $$
declare next_count int;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.ai_usage(user_id,used_on,request_count) values(auth.uid(),current_date,1)
  on conflict(user_id,used_on) do update set request_count=public.ai_usage.request_count+1 where public.ai_usage.request_count<10
  returning request_count into next_count;
  if next_count is null then raise exception 'Daily AI limit reached'; end if;
  return 10-next_count;
end; $$;
grant execute on function public.consume_ai_quota() to authenticated;
commit;
