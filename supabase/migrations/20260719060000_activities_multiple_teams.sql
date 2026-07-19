-- Migration: Allow multiple teams for activities
begin;

alter table public.activities add column if not exists team_ids uuid[];

commit;
