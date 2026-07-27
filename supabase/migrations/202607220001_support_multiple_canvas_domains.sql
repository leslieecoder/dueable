alter table public.courses
add column if not exists canvas_base_url text;

update public.courses
set canvas_base_url = 'https://ensign.instructure.com'
where canvas_base_url is null or btrim(canvas_base_url) = '';

alter table public.courses
alter column canvas_base_url set default 'https://ensign.instructure.com';

alter table public.courses
alter column canvas_base_url set not null;

alter table public.courses
drop constraint if exists courses_user_id_canvas_course_id_key;

create unique index if not exists courses_user_id_canvas_base_url_canvas_course_id_idx
on public.courses (user_id, canvas_base_url, canvas_course_id);
