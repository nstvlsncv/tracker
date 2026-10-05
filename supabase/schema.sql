-- Трекер: схема базы (SPEC.md, раздел 13).
-- Регистрации в приложении нет: пользователей заводят вручную в Authentication → Users,
-- а строка в profiles создаётся приложением при первом входе.
-- Как применить: Supabase → SQL Editor → вставить весь файл → Run.
-- Скрипт можно запускать повторно, существующие данные он не трогает.

-- ---------------------------------------------------------------------------
-- Таблицы
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  last_name text check (char_length(last_name) <= 100),
  password_changed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- понедельник недели
  week_start date not null check (extract(isodow from week_start) = 1),
  title text not null check (char_length(title) between 1 and 200),
  is_done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  title text not null check (char_length(title) between 1 and 200),
  is_done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  frequency text not null default 'daily',
  -- место в списке, меньше значит выше; null = по времени создания
  position integer,
  -- null = активна
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_checks (
  habit_id uuid not null references public.habits on delete cascade,
  date date not null,
  primary key (habit_id, date)
);

create index if not exists goals_user_week_idx on public.goals (user_id, week_start);
create index if not exists tasks_user_date_idx on public.tasks (user_id, date);
create index if not exists habits_user_idx on public.habits (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: каждый видит и меняет только свои строки
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checks enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "own goals" on public.goals;
create policy "own goals" on public.goals for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own tasks" on public.tasks;
create policy "own tasks" on public.tasks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own habits" on public.habits;
create policy "own habits" on public.habits for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own habit checks" on public.habit_checks;
create policy "own habit checks" on public.habit_checks for all to authenticated
  using (exists (
    select 1 from public.habits h
    where h.id = habit_id and h.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.habits h
    where h.id = habit_id and h.user_id = (select auth.uid())
  ));

grant select, insert, update, delete
  on public.profiles, public.goals, public.tasks, public.habits, public.habit_checks
  to authenticated;

-- ---------------------------------------------------------------------------
-- Функции
-- ---------------------------------------------------------------------------

-- Удаление аккаунта: каскадно удаляет профиль, цели, задачи, привычки и отметки.
create or replace function public.delete_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- Сессии для экрана Профиля. Таблица auth.sessions снаружи недоступна, поэтому список
-- отдаёт функция, и только сессии того, кто её вызвал.
create or replace function public.list_sessions()
returns table (id uuid, user_agent text, last_active_at timestamptz, is_current boolean)
language sql
security definer
stable
set search_path = ''
as $$
  select
    s.id,
    s.user_agent,
    coalesce(s.refreshed_at at time zone 'utc', s.updated_at, s.created_at) as last_active_at,
    s.id = ((select auth.jwt()) ->> 'session_id')::uuid as is_current
  from auth.sessions s
  where s.user_id = (select auth.uid())
  order by is_current desc, last_active_at desc;
$$;

revoke all on function public.list_sessions() from public, anon;
grant execute on function public.list_sessions() to authenticated;

-- Завершить одну свою сессию: на том устройстве вход пропадёт в течение часа,
-- когда истечёт уже выданный ему пропуск.
create or replace function public.end_session(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where id = target and user_id = (select auth.uid());
$$;

revoke all on function public.end_session(uuid) from public, anon;
grant execute on function public.end_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Приведение базы, созданной прежней версией этого файла, к текущей схеме
-- ---------------------------------------------------------------------------

-- Порядок привычек в списке (перестановка кнопками «Выше» и «Ниже»).
alter table public.habits add column if not exists position integer;

-- Расписание привычек. frequency: 'daily' (каждый день), 'days' (по дням недели из days,
-- 1 = понедельник), 'weekly' (times_per_week раз в неделю в любые дни).
alter table public.habits
  add column if not exists days smallint[] not null default '{}',
  add column if not exists times_per_week smallint check (times_per_week between 1 and 7);

-- Заметка недели: одно текстовое поле на неделю.
create table if not exists public.week_notes (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- понедельник недели
  week_start date not null check (extract(isodow from week_start) = 1),
  text text not null check (char_length(text) between 1 and 5000),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.week_notes enable row level security;
drop policy if exists "own week notes" on public.week_notes;
create policy "own week notes" on public.week_notes for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.week_notes to authenticated;

-- Настроение дня: одна отметка на день, от 1 (плохой день) до 5 (отличный).
create table if not exists public.day_moods (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  mood smallint not null check (mood between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.day_moods enable row level security;
drop policy if exists "own day moods" on public.day_moods;
create policy "own day moods" on public.day_moods for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.day_moods to authenticated;

-- Повторяющиеся задачи: правило повтора. Задачи на каждый день обычные строки tasks,
-- их ставит приложение, когда открывают неделю.
create table if not exists public.task_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  repeat text not null check (repeat in ('daily', 'weekdays', 'weekly')),
  start_date date not null,
  -- null = повторяется без конца
  end_date date,
  -- дни, на которые задачу заново ставить не нужно (её удалили или перенесли)
  skipped date[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.task_rules enable row level security;
drop policy if exists "own task rules" on public.task_rules;
create policy "own task rules" on public.task_rules for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.task_rules to authenticated;

alter table public.tasks
  add column if not exists rule_id uuid references public.task_rules on delete set null;
-- Одна задача правила на день: открыть неделю с двух устройств сразу не создаст дубль.
-- У обычных задач rule_id пустой, и это ограничение их не касается.
create unique index if not exists tasks_rule_date_idx on public.tasks (rule_id, date);

-- Регистрация с кодом из письма и согласием убрана вместе со своими полями и функцией.
drop function if exists public.email_registered(text);
alter table public.profiles
  drop column if exists consent_accepted_at,
  drop column if exists consent_version,
  add column if not exists last_name text check (char_length(last_name) <= 100);

-- Фото профиля: адрес файла в профиле, сам файл в хранилище, в корзине avatars.
-- У каждого своя папка с именем его id; читать фото по адресу может кто угодно (корзина публичная),
-- а класть, заменять и удалять файлы можно только в своей папке.
alter table public.profiles
  add column if not exists avatar_url text check (char_length(avatar_url) <= 500);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "own avatar: read" on storage.objects;
create policy "own avatar: read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own avatar: add" on storage.objects;
create policy "own avatar: add" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own avatar: replace" on storage.objects;
create policy "own avatar: replace" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own avatar: remove" on storage.objects;
create policy "own avatar: remove" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Порядок задач в дне: место задачи, если её двигали вручную. Пусто: по времени создания.
alter table public.tasks
  add column if not exists position integer;

-- Паузы привычки (отпуск, болезнь): список отрезков {"from": "2026-10-05", "to": null}.
-- В эти дни привычка не ждёт отметки, и серию они не рвут.
alter table public.habits
  add column if not exists pauses jsonb not null default '[]'::jsonb;
