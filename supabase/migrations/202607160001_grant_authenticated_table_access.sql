grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table public.users to authenticated;
grant select, insert, update, delete on table public.courses to authenticated;
grant select, insert, update, delete on table public.assignments to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

grant all privileges on table public.users to service_role;
grant all privileges on table public.courses to service_role;
grant all privileges on table public.assignments to service_role;
grant all privileges on table public.tasks to service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
grant all privileges on tables to service_role;