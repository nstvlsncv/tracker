import {
  ArrowLeft,
  ArrowsClockwise,
  CaretDown,
  CaretUp,
  ChartBar,
  Heartbeat,
  MagnifyingGlass,
  PuzzlePiece,
  Pulse,
  UsersThree,
} from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { Mascot } from '../../components/Mascot'
import type { AdminApi, AdminDay, AdminTable, AdminUser } from '../../data/admin'
import { CHANGELOG } from '../../data/changelog'
import {
  adoption,
  formatCount,
  lastSeen,
  overview,
  percent,
  STATUS_LABELS,
  STATUS_ORDER,
  userName,
  userStatus,
} from '../../lib/admin'
import type { UserStatus } from '../../lib/admin'
import { cx } from '../../lib/cx'
import { formatAgo, formatDateNumeric, formatDayShort } from '../../lib/dates'
import styles from './Admin.module.css'

type Props = {
  api: AdminApi
  /** Адрес самой админки: от него строятся ссылки на её разделы. */
  base: string
  /** Куда ведёт «В трекер». */
  home: string
}

const SECTIONS = [
  { id: 'overview', label: 'Обзор', icon: ChartBar },
  { id: 'users', label: 'Пользователи', icon: UsersThree },
  { id: 'activity', label: 'Активность', icon: Pulse },
  { id: 'features', label: 'Возможности', icon: PuzzlePiece },
  { id: 'status', label: 'Состояние', icon: Heartbeat },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const PERIODS = [30, 90] as const
type Period = (typeof PERIODS)[number]

type Data = { users: AdminUser[]; daily: AdminDay[]; tables: AdminTable[]; responseMs: number; loadedAt: Date }

/** Что показывает график активности. */
const METRICS = [
  { id: 'activeUsers', label: 'Активные люди' },
  { id: 'tasksCreated', label: 'Задач создано' },
  { id: 'tasksDone', label: 'Задач выполнено' },
  { id: 'checks', label: 'Отметки привычек' },
  { id: 'moods', label: 'Отметки настроения' },
] as const
type Metric = (typeof METRICS)[number]['id']

/** Таблицы базы по-человечески: что в них лежит. */
const TABLE_LABELS: Record<string, string> = {
  profiles: 'Профили',
  tasks: 'Задачи',
  goals: 'Цели недели',
  task_rules: 'Правила повтора задач',
  habits: 'Привычки',
  habit_checks: 'Отметки привычек',
  day_moods: 'Настроение по дням',
  week_notes: 'Заметки недель',
  finance_items: 'Строки финансов',
  finance_checks: 'Отметки финансов',
  finance_days: 'Даты аванса и зарплаты',
}

/**
 * Админка: сводная статистика по всем аккаунтам трекера. Отдельный экран со своим видом
 * (плотные таблицы, рамки вместо заливок, системный шрифт): владелица попросила «в стиле
 * Notion, Linear, GitHub». Показывает только числа и служебные сведения: названий задач,
 * заметок и сумм здесь нет. Доступна только тем, кто записан в таблицу admins.
 */
export function Admin({ api, base, home }: Props) {
  const { section = 'overview' } = useParams()
  // undefined: ещё проверяем. false: прав нет.
  const [allowed, setAllowed] = useState<boolean>()
  const [data, setData] = useState<Data | 'error'>()
  const [period, setPeriod] = useState<Period>(30)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.isAdmin().then(
      (value) => {
        if (!cancelled) setAllowed(value)
      },
      () => {
        if (!cancelled) setAllowed(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [api])

  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    const started = performance.now()
    Promise.all([api.loadUsers(), api.loadDaily(period), api.loadTables()]).then(
      ([users, daily, tables]) => {
        if (cancelled) return
        setData({ users, daily, tables, responseMs: Math.round(performance.now() - started), loadedAt: new Date() })
      },
      () => {
        if (!cancelled) setData('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [api, allowed, period, attempt])

  const reload = useCallback(() => setAttempt((current) => current + 1), [])

  const known = SECTIONS.find((item) => item.id === section)
  if (!known) return <Navigate to={base} replace />

  if (allowed === false) {
    return (
      <div className={cx(styles.admin, styles.center)}>
        <Mascot size={56} mood="shy" interactive={false} />
        <h1 className={styles.h1}>Сюда можно только админу</h1>
        <p className={styles.muted}>У этого аккаунта нет прав на админку</p>
        <Link className={styles.button} to={home}>
          Вернуться в трекер
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.admin}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Mascot size={24} interactive={false} still />
          <span>Трекер</span>
          <span className={styles.tag}>админка</span>
        </div>
        <nav className={styles.nav} aria-label="Разделы админки">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              to={id === 'overview' ? base : `${base}/${id}`}
              className={cx(styles.navItem, id === known.id && styles.navOn)}
              aria-current={id === known.id ? 'page' : undefined}
            >
              <Icon aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <Link className={styles.back} to={home}>
          <ArrowLeft aria-hidden />В трекер
        </Link>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.h1}>{known.label}</h1>
          <div className={styles.tools}>
            {data && data !== 'error' && (
              <span className={styles.muted}>
                Обновлено в {data.loadedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button type="button" className={styles.button} onClick={reload}>
              <ArrowsClockwise aria-hidden />
              Обновить
            </button>
          </div>
        </header>

        {data === 'error' ? (
          <Panel title="Не получилось загрузить данные">
            <p className={styles.muted}>
              Проверь связь. Если админку только что добавили, в Supabase нужно заново запустить схему
            </p>
            <div>
              <button type="button" className={styles.button} onClick={reload}>
                Повторить
              </button>
            </div>
          </Panel>
        ) : !data ? (
          <p className={styles.muted}>Загружаю…</p>
        ) : (
          <Sections id={known.id} data={data} period={period} onPeriod={setPeriod} base={base} />
        )}
      </main>
    </div>
  )
}

type SectionsProps = {
  id: SectionId
  data: Data
  period: Period
  onPeriod: (period: Period) => void
  base: string
}

function Sections({ id, data, period, onPeriod, base }: SectionsProps) {
  const now = data.loadedAt
  if (id === 'users') return <UsersTable users={data.users} now={now} />
  if (id === 'activity') return <Activity daily={data.daily} period={period} onPeriod={onPeriod} />
  if (id === 'features') return <Features users={data.users} />
  if (id === 'status') return <Status data={data} />
  return <OverviewSection data={data} period={period} onPeriod={onPeriod} base={base} />
}

/** Рамка с заголовком: основной блок админки. */
function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.panel}>
      <header className={styles.panelHead}>
        <h2 className={styles.h2}>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  )
}

function Kpi({ value, label, hint }: { value: ReactNode; label: string; hint?: string }) {
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
      {hint && <span className={styles.muted}>{hint}</span>}
    </div>
  )
}

function StatusPill({ status }: { status: UserStatus }) {
  return (
    <span className={cx(styles.pill, styles[status])}>
      <span className={styles.dot} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  )
}

function PeriodSwitch({ period, onPeriod }: { period: Period; onPeriod: (period: Period) => void }) {
  return (
    <div className={styles.switch} role="group" aria-label="Период">
      {PERIODS.map((days) => (
        <button
          key={days}
          type="button"
          className={cx(styles.switchItem, days === period && styles.switchOn)}
          aria-pressed={days === period}
          onClick={() => onPeriod(days)}
        >
          {days} дней
        </button>
      ))}
    </div>
  )
}

/** Столбики по дням. Высота столбика считается от самого большого значения периода. */
function Chart({ daily, metric }: { daily: AdminDay[]; metric: Metric }) {
  const top = Math.max(1, ...daily.map((day) => day[metric]))
  // Подписи дат: первая, последняя и несколько между ними, чтобы не слипались.
  const step = Math.max(1, Math.round(daily.length / 6))
  return (
    <div className={styles.chart}>
      <div className={styles.bars}>
        {daily.map((day) => (
          <div
            key={day.day}
            className={styles.barSlot}
            title={`${formatDayShort(parseISO(day.day))}: ${formatCount(day[metric])}`}
          >
            <div className={styles.barFill} style={{ height: `${(day[metric] / top) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className={styles.axis} aria-hidden>
        {daily.map((day, index) => (
          <span key={day.day}>
            {index % step === 0 || index === daily.length - 1 ? formatDayShort(parseISO(day.day)) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function OverviewSection({ data, period, onPeriod, base }: Omit<SectionsProps, 'id'>) {
  const now = data.loadedAt
  const totals = overview(data.users, data.daily, now)
  const recent = [...data.users]
    .filter((user) => lastSeen(user))
    .sort((a, b) => (lastSeen(b) ?? '').localeCompare(lastSeen(a) ?? ''))
    .slice(0, 5)
  return (
    <>
      <div className={styles.kpis}>
        <Kpi value={totals.users} label="Аккаунтов" hint={`новых за 30 дней: ${totals.newUsers}`} />
        <Kpi
          value={totals.active}
          label="Активны за 7 дней"
          hint={`${percent(totals.active, totals.users) ?? 0}% от всех`}
        />
        <Kpi value={formatCount(totals.tasksDone)} label={`Задач выполнено за ${period} дней`} hint={`создано: ${formatCount(totals.tasksCreated)}`} />
        <Kpi value={formatCount(totals.checks)} label={`Отметок привычек за ${period} дней`} hint={`настроения: ${formatCount(totals.moods)}`} />
        <Kpi
          value={totals.doneRate === null ? '—' : `${totals.doneRate}%`}
          label="Задач доводят до конца"
          hint="за всё время"
        />
      </div>

      <Panel title="Активные люди по дням" aside={<PeriodSwitch period={period} onPeriod={onPeriod} />}>
        <Chart daily={data.daily} metric="activeUsers" />
      </Panel>

      <div className={styles.columns}>
        <Panel title="Кто как пользуется">
          <ul className={styles.list}>
            {STATUS_ORDER.map((status) => (
              <li key={status} className={styles.row}>
                <StatusPill status={status} />
                <span className={styles.rowValue}>{totals[status]}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Недавно в трекере"
          aside={
            <Link className={styles.link} to={`${base}/users`}>
              Все пользователи
            </Link>
          }
        >
          <ul className={styles.list}>
            {recent.map((user) => (
              <li key={user.id} className={styles.row}>
                <span className={styles.person}>
                  <Initial user={user} />
                  {userName(user)}
                </span>
                <span className={styles.muted}>{formatAgo(parseISO(lastSeen(user)!), now)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}

/** Кружок с фото или первой буквой имени. */
function Initial({ user }: { user: AdminUser }) {
  if (user.avatarUrl) return <img className={styles.avatar} src={user.avatarUrl} alt="" />
  return (
    <span className={styles.avatar} aria-hidden>
      {userName(user)[0].toUpperCase()}
    </span>
  )
}

type SortKey = 'name' | 'status' | 'created' | 'seen' | 'tasks' | 'habits'

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Пользователь' },
  { key: 'status', label: 'Статус' },
  { key: 'created', label: 'Создан' },
  { key: 'seen', label: 'Был в трекере' },
  { key: 'tasks', label: 'Задачи' },
  { key: 'habits', label: 'Привычки' },
]

function UsersTable({ users, now }: { users: AdminUser[]; now: Date }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'seen', desc: true })
  const [open, setOpen] = useState<string>()

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const value = (user: AdminUser): string | number => {
      if (sort.key === 'name') return userName(user).toLowerCase()
      if (sort.key === 'status') return STATUS_ORDER.indexOf(userStatus(user, now))
      if (sort.key === 'created') return user.createdAt
      if (sort.key === 'seen') return lastSeen(user) ?? ''
      if (sort.key === 'tasks') return user.tasks
      return user.checks
    }
    return users
      .filter((user) => !needle || `${userName(user)} ${user.email}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const [left, right] = [value(a), value(b)]
        const order = left < right ? -1 : left > right ? 1 : 0
        return sort.desc ? -order : order
      })
  }, [users, query, sort, now])

  return (
    <Panel
      title={`Аккаунты: ${rows.length}`}
      aside={
        <label className={styles.search}>
          <MagnifyingGlass aria-hidden />
          <input
            type="search"
            placeholder="Имя или логин"
            aria-label="Поиск по имени или логину"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      }
    >
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map(({ key, label }) => (
                <th key={key} aria-sort={sort.key === key ? (sort.desc ? 'descending' : 'ascending') : undefined}>
                  <button
                    type="button"
                    className={styles.th}
                    onClick={() => setSort({ key, desc: sort.key === key ? !sort.desc : key !== 'name' })}
                  >
                    {label}
                    {sort.key === key && (sort.desc ? <CaretDown aria-hidden /> : <CaretUp aria-hidden />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => {
              const seen = lastSeen(user)
              const rate = percent(user.tasksDone, user.tasks)
              const expanded = open === user.id
              return [
                <tr
                  key={user.id}
                  className={cx(styles.tr, expanded && styles.trOpen)}
                  onClick={() => setOpen(expanded ? undefined : user.id)}
                >
                  <td>
                    <span className={styles.person}>
                      <Initial user={user} />
                      <span className={styles.who}>
                        <span>{userName(user)}</span>
                        <span className={styles.muted}>{user.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <StatusPill status={userStatus(user, now)} />
                  </td>
                  <td>{formatDateNumeric(parseISO(user.createdAt))}</td>
                  <td>{seen ? formatAgo(parseISO(seen), now) : 'не заходил'}</td>
                  <td>
                    <span className={styles.meter}>
                      <span className={styles.num}>
                        {formatCount(user.tasksDone)} из {formatCount(user.tasks)}
                      </span>
                      <span className={styles.track}>
                        <span style={{ width: `${rate ?? 0}%` }} />
                      </span>
                    </span>
                  </td>
                  <td className={styles.num}>
                    {user.habits > 0 ? `${user.habits} · отметок ${formatCount(user.checks)}` : '—'}
                  </td>
                </tr>,
                expanded && (
                  <tr key={`${user.id}-more`} className={styles.more}>
                    <td colSpan={COLUMNS.length}>
                      <dl className={styles.facts}>
                        <Fact label="Последний вход" value={user.lastSignInAt ? formatAgo(parseISO(user.lastSignInAt), now) : 'ни разу'} />
                        <Fact label="Последнее действие" value={user.lastActivity ? formatAgo(parseISO(user.lastActivity), now) : 'не было'} />
                        <Fact label="Цели" value={`${user.goalsDone} из ${user.goals}`} />
                        <Fact label="Правила повтора" value={user.rules} />
                        <Fact label="Дней с настроением" value={user.moods} />
                        <Fact label="Заметок недели" value={user.notes} />
                        <Fact label="Строк в финансах" value={user.financeItems} />
                        <Fact label="Тема и цвет" value={[user.theme ?? 'системная', user.accent ?? 'lime'].join(', ')} />
                        <Fact label="Знакомство" value={user.onboarded ? 'пройдено' : 'не видел'} />
                      </dl>
                    </td>
                  </tr>
                ),
              ]
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className={styles.empty}>Никого не нашлось</p>}
      </div>
    </Panel>
  )
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.fact}>
      <dt className={styles.muted}>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function Activity({ daily, period, onPeriod }: { daily: AdminDay[]; period: Period; onPeriod: (period: Period) => void }) {
  const [metric, setMetric] = useState<Metric>('activeUsers')
  const label = METRICS.find((item) => item.id === metric)!.label
  return (
    <>
      <Panel title={label} aside={<PeriodSwitch period={period} onPeriod={onPeriod} />}>
        <div className={styles.switch} role="group" aria-label="Что показать">
          {METRICS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx(styles.switchItem, item.id === metric && styles.switchOn)}
              aria-pressed={item.id === metric}
              onClick={() => setMetric(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Chart daily={daily} metric={metric} />
      </Panel>
      <Panel title="По дням">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>День</th>
                {METRICS.map((item) => (
                  <th key={item.id} className={styles.right}>
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((day) => (
                <tr key={day.day}>
                  <td>{formatDateNumeric(parseISO(day.day))}</td>
                  {METRICS.map((item) => (
                    <td key={item.id} className={cx(styles.num, styles.right)}>
                      {day[item.id] === 0 ? <span className={styles.muted}>0</span> : formatCount(day[item.id])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

function Features({ users }: { users: AdminUser[] }) {
  const rows = adoption(users)
  return (
    <Panel title="Кто чем пользуется" aside={<span className={styles.muted}>из {users.length} аккаунтов</span>}>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.id} className={styles.feature}>
            <span>{row.label}</span>
            <span className={styles.track}>
              <span style={{ width: `${row.share}%` }} />
            </span>
            <span className={styles.num}>
              {row.users} · {row.share}%
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function Status({ data }: { data: Data }) {
  const release = CHANGELOG[0]
  const total = data.tables.reduce((sum, table) => sum + table.rows, 0)
  return (
    <>
      <div className={styles.kpis}>
        <Kpi value={release.version} label="Версия трекера" hint={`выложена ${formatDateNumeric(parseISO(release.date))}`} />
        <Kpi
          value={
            <span className={cx(styles.pill, styles.active)}>
              <span className={styles.dot} aria-hidden />
              Отвечает
            </span>
          }
          label="База данных"
          hint={`ответ за ${data.responseMs} мс`}
        />
        <Kpi value={formatCount(total)} label="Строк в базе" hint={`таблиц: ${data.tables.length}`} />
      </div>
      <Panel title="Таблицы">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Что лежит</th>
                <th>Таблица</th>
                <th className={styles.right}>Строк</th>
              </tr>
            </thead>
            <tbody>
              {data.tables.map((table) => (
                <tr key={table.name}>
                  <td>{TABLE_LABELS[table.name] ?? table.name}</td>
                  <td className={styles.code}>{table.name}</td>
                  <td className={cx(styles.num, styles.right)}>{formatCount(table.rows)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Последние выкладки">
        <ul className={styles.list}>
          {CHANGELOG.slice(0, 5).map((item) => (
            <li key={item.version} className={styles.release}>
              <span className={styles.code}>{item.version}</span>
              <span className={styles.muted}>{formatDateNumeric(parseISO(item.date))}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}
