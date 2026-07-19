begin;
alter table public.activities add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.profiles add column if not exists avatar_url text;
alter table public.announcements add column if not exists author_role text check(author_role in ('shad','pa','lt'));
alter table public.announcements add column if not exists team_id uuid references public.teams(id) on delete set null;
create or replace function public.set_announcement_author_role() returns trigger language plpgsql security definer set search_path='' as $$
begin select role into new.author_role from public.user_roles where user_id=new.created_by; return new; end; $$;
drop trigger if exists announcement_author_role on public.announcements;
create trigger announcement_author_role before insert or update of created_by on public.announcements for each row execute function public.set_announcement_author_role();
drop policy if exists "users create activities" on public.activities;
drop policy if exists "staff creates activities" on public.activities;
create policy "staff creates activities" on public.activities for insert to authenticated
with check ((select public.is_staff()) and creator_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=true;
drop policy if exists "public avatar reads" on storage.objects;
drop policy if exists "users upload own avatar" on storage.objects;
drop policy if exists "users update own avatar" on storage.objects;
drop policy if exists "users delete own avatar" on storage.objects;
create policy "public avatar reads" on storage.objects for select using(bucket_id='avatars');
create policy "users upload own avatar" on storage.objects for insert to authenticated
with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "users update own avatar" on storage.objects for update to authenticated
using(bucket_id='avatars' and owner_id=(select auth.uid()::text));
create policy "users delete own avatar" on storage.objects for delete to authenticated
using(bucket_id='avatars' and owner_id=(select auth.uid()::text));
commit;
