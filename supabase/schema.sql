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

-- Финансы: обязательные траты месяца. Месяц делится на два этапа, аванс и зарплату.
-- Строка этапа (поступление, платёж или накопление) повторяется из месяца в месяц:
-- живёт с месяца start_month по end_month. Месяц записан текстом, '2026-10'.
create table if not exists public.finance_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  stage text not null check (stage in ('advance', 'salary')),
  -- income: поступление, bill: обязательный платёж, saving: накопление
  kind text not null check (kind in ('income', 'bill', 'saving')),
  title text not null check (char_length(title) between 1 and 60),
  amount numeric(11, 2) not null check (amount > 0),
  start_month text not null check (start_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- null = без конца
  end_month text check (end_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  created_at timestamptz not null default now()
);

alter table public.finance_items enable row level security;
drop policy if exists "own finance items" on public.finance_items;
create policy "own finance items" on public.finance_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.finance_items to authenticated;

-- Отметка «оплачено» или «отложено» за месяц.
create table if not exists public.finance_checks (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  item_id uuid not null references public.finance_items on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  primary key (item_id, month)
);

alter table public.finance_checks enable row level security;
drop policy if exists "own finance checks" on public.finance_checks;
create policy "own finance checks" on public.finance_checks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.finance_checks to authenticated;

-- Число месяца, в которое приходит аванс или зарплата. Действует с месяца month и дальше,
-- пока в более позднем месяце не записано другое.
create table if not exists public.finance_days (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  stage text not null check (stage in ('advance', 'salary')),
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  day smallint not null check (day between 1 and 31),
  primary key (user_id, stage, month)
);

alter table public.finance_days enable row level security;
drop policy if exists "own finance days" on public.finance_days;
create policy "own finance days" on public.finance_days for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.finance_days to authenticated;

-- Траты по дням: сумма без названия и категории. Уменьшает свободные деньги этапа,
-- в который попадает день, и от неё считается, сколько можно потратить сегодня.
create table if not exists public.finance_spends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  amount numeric(11, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists finance_spends_user_date on public.finance_spends (user_id, date);

alter table public.finance_spends enable row level security;
drop policy if exists "own finance spends" on public.finance_spends;
create policy "own finance spends" on public.finance_spends for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.finance_spends to authenticated;

-- Списки: всё, что не привязано к дню (продукты, фильмы, идеи). Список и его пункты.
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  position integer,
  created_at timestamptz not null default now()
);

alter table public.lists enable row level security;
drop policy if exists "own lists" on public.lists;
create policy "own lists" on public.lists for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.lists to authenticated;

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  list_id uuid not null references public.lists on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  is_done boolean not null default false,
  position integer,
  created_at timestamptz not null default now()
);

create index if not exists list_items_list on public.list_items (list_id);

alter table public.list_items enable row level security;
drop policy if exists "own list items" on public.list_items;
create policy "own list items" on public.list_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.list_items to authenticated;

-- ---------------------------------------------------------------------------
-- Админка (/admin): сводная статистика по всем аккаунтам для владелицы трекера.
-- Кто админ, записано в таблице admins: строку туда добавляют вручную в SQL Editor
--   insert into public.admins (user_id) select id from auth.users where email = 'логин';
-- Напрямую таблицу не читает и не меняет никто (политик нет). Данные чужих аккаунтов
-- отдают только функции ниже, только админу и только числами: сколько задач, привычек,
-- отметок. Названий задач, заметок и сумм в них нет.
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Все аккаунты: кто, когда появился и заходил, сколько чего завёл.
create or replace function public.admin_users()
returns table (
  id uuid,
  email text,
  name text,
  last_name text,
  avatar_url text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  tasks bigint,
  tasks_done bigint,
  goals bigint,
  goals_done bigint,
  habits bigint,
  checks bigint,
  moods bigint,
  notes bigint,
  rules bigint,
  finance_items bigint,
  last_activity timestamptz,
  onboarded boolean,
  theme text,
  accent text
)
language plpgsql
security definer
stable
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select
    u.id,
    u.email::text,
    p.name,
    p.last_name,
    p.avatar_url,
    u.created_at,
    u.last_sign_in_at,
    -- Задачи из правил повтора встают сами: в счёт идут только заведённые руками и выполненные.
    (select count(*) from public.tasks t where t.user_id = u.id and (t.rule_id is null or t.is_done)),
    (select count(*) from public.tasks t where t.user_id = u.id and t.is_done),
    (select count(*) from public.goals g where g.user_id = u.id),
    (select count(*) from public.goals g where g.user_id = u.id and g.is_done),
    (select count(*) from public.habits h where h.user_id = u.id),
    (select count(*) from public.habit_checks c
       join public.habits h on h.id = c.habit_id where h.user_id = u.id),
    (select count(*) from public.day_moods m where m.user_id = u.id),
    (select count(*) from public.week_notes n where n.user_id = u.id),
    (select count(*) from public.task_rules r where r.user_id = u.id),
    (select count(*) from public.finance_items f where f.user_id = u.id),
    -- Последнее действие в трекере: самое свежее из всего, что человек создавал и отмечал.
    greatest(
      (select max(t.created_at) from public.tasks t where t.user_id = u.id and t.rule_id is null),
      (select max(t.done_at) from public.tasks t where t.user_id = u.id),
      (select max(g.created_at) from public.goals g where g.user_id = u.id),
      (select max(g.done_at) from public.goals g where g.user_id = u.id),
      (select max(h.created_at) from public.habits h where h.user_id = u.id),
      (select max(m.updated_at) from public.day_moods m where m.user_id = u.id),
      (select max(n.updated_at) from public.week_notes n where n.user_id = u.id),
      (select max(f.created_at) from public.finance_items f where f.user_id = u.id)
    ),
    coalesce((u.raw_user_meta_data ->> 'onboarded') = 'true', false),
    u.raw_user_meta_data ->> 'theme',
    u.raw_user_meta_data ->> 'accent'
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at;
end;
$$;

revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

-- Активность по дням за последние days дней: что создали и отметили, сколько людей заходило по делу.
create or replace function public.admin_daily(days integer)
returns table (
  day date,
  tasks_created bigint,
  tasks_done bigint,
  checks bigint,
  moods bigint,
  active_users bigint
)
language plpgsql
security definer
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  since date := current_date - (least(greatest(days, 1), 366) - 1);
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  with span as (
    select generate_series(since, current_date, interval '1 day')::date as day
  ),
  events as (
    select t.user_id, t.created_at::date as day, 'created' as kind
      from public.tasks t where t.rule_id is null and t.created_at >= since
    union all
    select t.user_id, t.done_at::date, 'done'
      from public.tasks t where t.done_at >= since
    union all
    select h.user_id, c.date, 'check'
      from public.habit_checks c join public.habits h on h.id = c.habit_id where c.date >= since
    union all
    select m.user_id, m.date, 'mood'
      from public.day_moods m where m.date >= since
  )
  select
    span.day,
    count(*) filter (where events.kind = 'created'),
    count(*) filter (where events.kind = 'done'),
    count(*) filter (where events.kind = 'check'),
    count(*) filter (where events.kind = 'mood'),
    count(distinct events.user_id)
  from span
  left join events on events.day = span.day
  group by span.day
  order by span.day;
end;
$$;

revoke all on function public.admin_daily(integer) from public, anon;
grant execute on function public.admin_daily(integer) to authenticated;

-- Сколько строк в каждой таблице трекера: для страницы «Состояние».
create or replace function public.admin_tables()
returns table (name text, rows bigint)
language plpgsql
security definer
stable
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select 'profiles'::text, count(*) from public.profiles
  union all select 'tasks', count(*) from public.tasks
  union all select 'goals', count(*) from public.goals
  union all select 'task_rules', count(*) from public.task_rules
  union all select 'habits', count(*) from public.habits
  union all select 'habit_checks', count(*) from public.habit_checks
  union all select 'day_moods', count(*) from public.day_moods
  union all select 'week_notes', count(*) from public.week_notes
  union all select 'finance_items', count(*) from public.finance_items
  union all select 'finance_checks', count(*) from public.finance_checks
  union all select 'finance_days', count(*) from public.finance_days
  union all select 'finance_spends', count(*) from public.finance_spends
  union all select 'lists', count(*) from public.lists
  union all select 'list_items', count(*) from public.list_items;
end;
$$;

revoke all on function public.admin_tables() from public, anon;
grant execute on function public.admin_tables() to authenticated;
