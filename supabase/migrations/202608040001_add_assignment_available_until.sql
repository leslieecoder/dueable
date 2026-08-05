alter table public.assignments
add column if not exists available_until timestamptz;

create index if not exists assignments_available_until_idx on public.assignments (available_until);