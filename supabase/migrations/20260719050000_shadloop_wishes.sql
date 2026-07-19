-- Migration: Add student wishes logging for AI search matching
begin;

create table if not exists public.shad_wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  prompt text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.shad_wishes enable row level security;

-- Policies
drop policy if exists "anyone can insert wishes" on public.shad_wishes;
create policy "anyone can insert wishes" on public.shad_wishes for insert to authenticated with check(true);

drop policy if exists "staff can read wishes" on public.shad_wishes;
create policy "staff can read wishes" on public.shad_wishes for select to authenticated using(true);

commit;
