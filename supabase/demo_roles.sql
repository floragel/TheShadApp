-- After creating these users in Supabase Authentication > Users, run this once.
-- Suggested demo emails: pa.test@example.com and lt.test@example.com.
update public.user_roles set role = 'shad'
where user_id = (select id from auth.users where email = 'lahlou.nayl@icloud.com');

update public.user_roles set role = 'pa'
where user_id = (select id from auth.users where email = 'pa.test@example.com');

update public.user_roles set role = 'lt'
where user_id = (select id from auth.users where email = 'lt.test@example.com');
