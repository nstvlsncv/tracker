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

-- ---------------------------------------------------------------------------
-- Приведение базы, созданной прежней версией этого файла, к текущей схеме
-- ---------------------------------------------------------------------------

-- Регистрация с кодом из письма и согласием убрана вместе со своими полями и функцией.
drop function if exists public.email_registered(text);
alter table public.profiles
  drop column if exists consent_accepted_at,
  drop column if exists consent_version,
  add column if not exists last_name text check (char_length(last_name) <= 100);
