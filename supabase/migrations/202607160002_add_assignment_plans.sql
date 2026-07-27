create table if not exists public.assignment_plans (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  provider_used text not null,
  plan_type text not null,
  title text not null,
  difficulty text not null,
  estimated_hours integer not null default 0 check (estimated_hours >= 0),
  estimated_days integer not null default 0 check (estimated_days >= 0),
  plan_snapshot jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists description text not null default '',
  add column if not exists source_plan_id uuid references public.assignment_plans (id) on delete set null;

create index if not exists assignment_plans_assignment_id_idx on public.assignment_plans (assignment_id);
create index if not exists assignment_plans_generated_at_idx on public.assignment_plans (generated_at desc);
create index if not exists tasks_source_plan_id_idx on public.tasks (source_plan_id);

create trigger set_assignment_plans_updated_at
before update on public.assignment_plans
for each row
execute function public.set_updated_at();

alter table public.assignment_plans enable row level security;

create policy "users manage own assignment plans"
on public.assignment_plans
for all
using (
  exists (
    select 1
    from public.assignments
    join public.courses on public.courses.id = public.assignments.course_id
    where public.assignments.id = public.assignment_plans.assignment_id
      and public.courses.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.assignments
    join public.courses on public.courses.id = public.assignments.course_id
    where public.assignments.id = public.assignment_plans.assignment_id
      and public.courses.user_id = auth.uid()
  )
);

grant select, insert, update, delete on table public.assignment_plans to authenticated;
grant all privileges on table public.assignment_plans to service_role;