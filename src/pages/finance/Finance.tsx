import { CalendarBlank, Plus } from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { Checkbox } from '../../components/Checkbox'
import { Dropdown } from '../../components/Dropdown'
import { IconButton } from '../../components/IconButton'
import { Kbd } from '../../components/Kbd'
import { Mascot } from '../../components/Mascot'
import { PageLoader } from '../../components/PageLoader'
import { StatCard } from '../../components/StatCard'
import { useToast } from '../../components/useToast'
import type { FinanceItem, FinanceKind, FinanceStage } from '../../data/finance'
import { useFinance } from '../../data/useFinance'
import { PageHeader } from '../../layout/PageHeader'
import { cx } from '../../lib/cx'
import {
  checkKey,
  currentPeriod,
  dayFor,
  daysLeft,
  formatMoney,
  formatMonth,
  formatPeriod,
  isOnce,
  itemsFor,
  KINDS,
  monthOf,
  monthOptions,
  perDay,
  spentIn,
  stageLabel,
  stagePeriods,
  summarize,
} from '../../lib/finance'
import { onNewItem } from '../../lib/hotkeys'
import { pluralize } from '../../lib/metrics'
import { useSessionState } from '../../lib/sessionState'
import { useToday } from '../../lib/useToday'
import { DayModal } from './DayModal'
import { ItemModal } from './ItemModal'
import { SpendBlock } from './SpendBlock'
import styles from './Finance.module.css'

/** Что подсказать в пустом списке этапа. */
const EXAMPLES: Record<FinanceKind, string> = {
  income: 'Сколько приходит',
  bill: 'Например: аренда, связь, кредит',
  saving: 'Например: подушка, отпуск',
}

const UNTIL: Record<FinanceStage, string> = { advance: 'до аванса', salary: 'до зарплаты' }

const days = (count: number) => `${count} ${pluralize(count, 'день', 'дня', 'дней')}`

/**
 * Экран «Финансы»: обязательные траты месяца. Месяц делится на два этапа, аванс и зарплату.
 * В каждом свои поступления (бюджет этапа), платежи и накопления; платежи и накопления
 * отмечаются, а этап показывает, сколько свободно и сколько осталось оплатить.
 */
export function Finance() {
  const store = useFinance()
  const toast = useToast()
  const today = useToday()
  const now = currentPeriod(store.days, today)
  // Какой месяц открыт, запоминается на время сеанса. Пока не выбирали: месяц текущего этапа
  // (в первых числах, до первого поступления, это ещё прошлый месяц).
  const [picked, setMonth] = useSessionState<string | null>('finance.month', null)
  const month = picked ?? now?.month ?? monthOf(today)
  const [editing, setEditing] = useState<FinanceItem | { kind: FinanceKind; stage: FinanceStage }>()
  const [dating, setDating] = useState<FinanceStage>()

  const ready = store.status === 'ready'
  const periods = stagePeriods(store.days, month)
  const items = itemsFor(store.items, month)
  const total = summarize(items, store.checks, month)
  // Траты по дням уменьшают свободные деньги этапа, в который попадает их день.
  const spends = store.spends ?? []
  const monthSpent = periods.reduce((sum, period) => sum + spentIn(spends, period), 0)

  // N на клавиатуре и кнопка в шапке: новый платёж в этапе, который идёт сейчас.
  const addBill = () => {
    if (!ready) return
    setEditing({ kind: 'bill', stage: now?.month === month ? now.stage : periods[0].stage })
  }
  useEffect(() => onNewItem(addBill))

  const header = (
    <PageHeader
      title="Финансы"
      help="finance"
      actions={
        ready && (
          <>
            {/* Месяц: серая кнопка со списком. На телефоне она главная в закреплённом ряду. */}
            <Dropdown
              className={styles.month}
              aria-label="Месяц"
              value={month}
              onChange={setMonth}
              options={monthOptions(month, monthOf(today), store.items).map((value) => ({
                value,
                label: formatMonth(value),
              }))}
            />
            <Button
              size="lg"
              icon={<Plus aria-hidden />}
              // На телефоне от кнопки остаётся квадрат с плюсом (см. PageHeader), подпись скрыта.
              data-compact
              aria-label="Добавить платёж"
              onClick={addBill}
            >
              <span data-label>
                Добавить платёж
                <Kbd>N</Kbd>
              </span>
            </Button>
          </>
        )
      }
    />
  )

  if (store.status === 'loading') {
    return (
      <>
        {header}
        <PageLoader />
      </>
    )
  }

  if (store.status === 'error') {
    return (
      <>
        {header}
        <div className={styles.error}>
          <p className={styles.hint}>Не удалось загрузить финансы</p>
          <div>
            <Button variant="secondary" onClick={store.reload}>
              Повторить
            </Button>
          </div>
        </div>
      </>
    )
  }

  if (store.status === 'unavailable') {
    return (
      <>
        {header}
        <div className={styles.placeholder}>
          <Mascot size={64} />
          <p>Финансы почти готовы: осталось обновить базу</p>
        </div>
      </>
    )
  }

  // Суммы в карточках сверху: без знака рубля, так они помещаются в узкую карточку на телефоне.
  const totals = [total.free - monthSpent, total.income, total.bills + total.savings, total.toPay].map((amount) =>
    formatMoney(amount, false),
  )

  return (
    <>
      {header}

      {/* Строк ещё нет: плашка подсказывает, с чего начать. */}
      {store.items.length === 0 && (
        <section className={styles.welcome}>
          <Mascot size={48} mood="happy" interactive={false} still />
          <div className={styles.welcomeText}>
            <h2 className="t-heading-5">С чего начать</h2>
            <p className={styles.hint}>
              Поставь даты аванса и зарплаты, впиши, сколько приходит, и добавь обязательные
              платежи и накопления. Дальше отмечай оплаченное, а трекер покажет, сколько свободно
            </p>
          </div>
        </section>
      )}

      <div className={cx(styles.stats, totals.some((text) => text.length > 7) && styles.long)}>
        <StatCard variant="highlight" value={totals[0]} label="свободно" />
        <StatCard value={totals[1]} label="поступления" />
        <StatCard value={totals[2]} label="обязательные" />
        <StatCard value={totals[3]} label="осталось оплатить" />
      </div>

      <div className={styles.board}>
        <div className={styles.stages}>
          {periods.map((period) => {
            const own = items.filter((item) => item.stage === period.stage)
            const summary = summarize(own, store.checks, month)
            const isNow = now?.month === month && now.stage === period.stage
            const spent = spentIn(spends, period)
            const free = summary.free - spent
            // Сумма на день в итоге нужна там, где её не показывают «Прочие расходы»:
            // в текущем этапе она уже стоит в них, вместе с расчётом.
            const daily = isNow && store.spends ? null : perDay(free, period.length)
            const label = stageLabel(period.stage)
            return (
              <section
                key={period.stage}
                className={cx(styles.stage, isNow && styles.now)}
                aria-label={label}
              >
                <header className={styles.stageHeader}>
                  <div className={styles.stageTitle}>
                    <h2 className="t-heading-5">{label}</h2>
                    {isNow && <span className={`t-caption ${styles.badge}`}>Сейчас</span>}
                  </div>
                  {/* Дата поступления: от неё считается период этапа. */}
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<CalendarBlank aria-hidden />}
                    aria-label={`Дата: ${label.toLowerCase()}`}
                    onClick={() => setDating(period.stage)}
                  >
                    {format(parseISO(period.start), 'd MMMM', { locale: ru })}
                  </Button>
                </header>
                <p className={`t-body-sm ${styles.hint}`}>
                  {formatPeriod(period)} · {days(period.length)}
                  {isNow && ` · ${UNTIL[period.next]} ${days(daysLeft(period, today))}`}
                </p>

                {KINDS.map((kind) => {
                  const rows = own.filter((item) => item.kind === kind.value)
                  return (
                    <div key={kind.value} className={styles.group}>
                      <div className={styles.groupHeader}>
                        <h3 className={`t-caption ${styles.groupTitle}`}>{kind.label}</h3>
                        <IconButton
                          variant="secondary"
                          size="sm"
                          icon={<Plus aria-hidden />}
                          aria-label={`Добавить ${kind.one.toLowerCase()}: ${label.toLowerCase()}`}
                          onClick={() => setEditing({ kind: kind.value, stage: period.stage })}
                        />
                      </div>
                      {rows.length > 0 ? (
                        <ul className={styles.list}>
                          {rows.map((item) => {
                            const done = store.checks.has(checkKey(item.id, month))
                            return (
                              <li key={item.id} className={styles.item}>
                                {/* Поступления не отмечаются: это бюджет этапа. */}
                                {item.kind !== 'income' && (
                                  <Checkbox
                                    checked={done}
                                    burst
                                    onChange={(next) => store.toggleCheck(item.id, month, next)}
                                    aria-label={`${done ? 'Снять отметку' : 'Отметить'}: ${item.title}`}
                                  />
                                )}
                                {/* Название и сумма нажимаются: открывают правку строки. */}
                                <button
                                  type="button"
                                  className={cx(styles.row, done && styles.done)}
                                  aria-label={`Изменить: ${item.title}, ${formatMoney(item.amount)}`}
                                  onClick={() => setEditing(item)}
                                >
                                  <span className={styles.title}>
                                    {item.title}
                                    {isOnce(item) && <span className={`t-caption ${styles.once}`}>разово</span>}
                                  </span>
                                  <span className={styles.sum}>{formatMoney(item.amount)}</span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className={styles.hint}>{EXAMPLES[kind.value]}</p>
                      )}
                    </div>
                  )
                })}

                {/* Прочие расходы: траты без названия. Вводятся в этапе, который идёт сейчас. */}
                {store.spends && (
                  <SpendBlock
                    period={period}
                    current={isNow}
                    free={summary.free}
                    noIncome={!own.some((item) => item.kind === 'income')}
                    spends={store.spends}
                    today={today}
                    onAdd={(amount) => store.addSpend(amount, today)}
                    onDelete={store.deleteSpend}
                  />
                )}

                <dl className={styles.total}>
                  <div className={styles.totalRow}>
                    <dt>Свободно</dt>
                    <dd>
                      {daily !== null && (
                        <span className={`t-body-sm ${styles.hint}`}>{formatMoney(daily)} в день · </span>
                      )}
                      {formatMoney(free)}
                    </dd>
                  </div>
                  <div className={styles.totalRow}>
                    <dt className={styles.hint}>Осталось оплатить</dt>
                    <dd className={styles.hint}>{formatMoney(summary.toPay)}</dd>
                  </div>
                </dl>
              </section>
            )
          })}
        </div>
      </div>

      {editing && (
        <ItemModal
          item={'id' in editing ? editing : undefined}
          kind={editing.kind}
          stage={editing.stage}
          month={month}
          onClose={() => setEditing(undefined)}
          onSave={(fields) => {
            if (!('id' in editing)) {
              store.addItem(fields, month)
              toast({ message: 'Добавлено' })
            } else if (fields.title !== editing.title || fields.amount !== editing.amount) {
              store.editItem(editing.id, month, fields.title, fields.amount)
              toast({ message: 'Сохранено' })
            }
            setEditing(undefined)
          }}
          onDelete={
            'id' in editing
              ? () => {
                  store.deleteItem(editing.id, month)
                  setEditing(undefined)
                }
              : undefined
          }
        />
      )}

      {dating && (
        <DayModal
          stage={dating}
          day={dayFor(store.days, dating, month)}
          month={month}
          onClose={() => setDating(undefined)}
          onSave={(day) => {
            if (day !== dayFor(store.days, dating, month)) {
              store.setDay(dating, month, day)
              toast({ message: 'Дата сохранена' })
            }
            setDating(undefined)
          }}
        />
      )}
    </>
  )
}
