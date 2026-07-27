create extension if not exists pgcrypto;

create type public.assignment_status as enum (
  'not_started',
  'in_progress',
  'completed'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update
  set
    name = excluded.name,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  canvas_course_id text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, canvas_course_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  canvas_assignment_id text not null,
  title text not null,
  description text not null default '',
  due_date timestamptz not null,
  estimated_hours integer not null default 1 check (estimated_hours >= 0),
  status public.assignment_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, canvas_assignment_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  estimated_minutes integer not null default 30 check (estimated_minutes >= 0),
  "order" integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, "order")
);

create index if not exists courses_user_id_idx on public.courses (user_id);
create index if not exists assignments_course_id_idx on public.assignments (course_id);
create index if not exists assignments_due_date_idx on public.assignments (due_date);
create index if not exists tasks_assignment_id_idx on public.tasks (assignment_id);
create index if not exists tasks_completed_idx on public.tasks (completed);

create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

create trigger set_courses_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

create trigger set_assignments_updated_at
before update on public.assignments
for each row
execute function public.set_updated_at();

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.assignments enable row level security;
alter table public.tasks enable row level security;

create policy "users can view own profile"
on public.users
for select
using (auth.uid() = id);

create policy "users can update own profile"
on public.users
for update
using (auth.uid() = id);

create policy "users can delete own profile"
on public.users
for delete
using (auth.uid() = id);

create policy "users can insert own profile"
on public.users
for insert
with check (auth.uid() = id);

create policy "users manage own courses"
on public.courses
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users manage own assignments"
on public.assignments
for all
using (
  exists (
    select 1
    from public.courses
    where public.courses.id = public.assignments.course_id
      and public.courses.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.courses
    where public.courses.id = public.assignments.course_id
      and public.courses.user_id = auth.uid()
  )
);

create policy "users manage own tasks"
on public.tasks
for all
using (
  exists (
    select 1
    from public.assignments
    join public.courses on public.courses.id = public.assignments.course_id
    where public.assignments.id = public.tasks.assignment_id
      and public.courses.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.assignments
    join public.courses on public.courses.id = public.assignments.course_id
    where public.assignments.id = public.tasks.assignment_id
      and public.courses.user_id = auth.uid()
  )
);