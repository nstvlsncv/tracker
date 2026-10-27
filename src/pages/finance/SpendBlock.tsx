import { Plus } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { IconButton } from '../../components/IconButton'
import type { FinanceSpend } from '../../data/finance'
import { cx } from '../../lib/cx'
import { formatDayMonth } from '../../lib/dates'
import { dayBudget, formatMoney, spendsIn } from '../../lib/finance'
import type { StagePeriod } from '../../lib/finance'
import { shiftDate } from '../../lib/metrics'
import { SpendModal } from './SpendModal'
import { SpendPad } from './SpendPad'
import styles from './Finance.module.css'

type Props = {
  period: StagePeriod
  /** Этап идёт сейчас: в нём записывают траты и считается, сколько можно потратить сегодня. */
  current: boolean
  /** Свободные деньги этапа до трат: поступления минус платежи. */
  free: number
  /** Поступлений в этапе ещё нет: считать нечего, блок подсказывает, что вписать. */
  noIncome: boolean
  spends: FinanceSpend[]
  /** Можно ли назвать трату: в старой базе у трат нет колонки с названием. */
  titles: boolean
  today: string
  onAdd: (amount: number, title: string | null) => void
  onEdit: (id: string, title: string | null, amount: number) => void
  onDelete: (id: string) => void
}

/** Сколько трат видно сразу, остальные открывает кнопка. */
const SHOWN = 3

/** Телефон: трата набирается клавиатурой-калькулятором, а не в окне с полями. */
const PHONE = '(max-width: 640px)'

/**
 * «Прочие расходы» внутри этапа, между платежами и итогом. Устроены как списки этапа:
 * в шапке название и плюс, нажатие на строку открывает правку с удалением. В этапе, который
 * идёт сейчас, под шапкой крупно стоит, сколько можно потратить сегодня и из какого бюджета дня.
 * Плюс открывает окно с названием и суммой, на телефоне клавиатуру-калькулятор. Сколько
 * потрачено за этап, стоит в итоге этапа. В прошедшем этапе остаётся только список.
 * Поля ввода прямо в блоке были раньше: владелица сочла блок непонятным и тяжёлым для чтения.
 */
export function SpendBlock({ period, current, free, noIncome, spends, titles, today, onAdd, onEdit, onDelete }: Props) {
  const [adding, setAdding] = useState<'modal' | 'pad'>()
  const [all, setAll] = useState(false)
  const [editing, setEditing] = useState<FinanceSpend>()

  const own = spendsIn(spends, period)
  // В прошедшем или будущем этапе без трат показывать нечего.
  if (!current && own.length === 0) return null

  const day = dayBudget(free, spends, period, today)
  const over = day.left < 0

  const dateLabel = (date: string) =>
    date === today ? 'сегодня' : date === shiftDate(today, -1) ? 'вчера' : formatDayMonth(parseISO(date))

  return (
    <div className={styles.group} role="group" aria-label="Прочие расходы">
      <div className={styles.groupHeader}>
        <h3 className={`t-caption ${styles.groupTitle}`}>Прочие расходы</h3>
        {current && (
          <IconButton
            variant="secondary"
            size="sm"
            icon={<Plus aria-hidden />}
            aria-label="Записать трату"
            onClick={() => setAdding(window.matchMedia(PHONE).matches ? 'pad' : 'modal')}
          />
        )}
      </div>

      {current &&
        (noIncome ? (
          <p className={styles.hint}>Впиши поступления этапа, и трекер посчитает, сколько можно тратить в день</p>
        ) : (
          // Бюджет дня: что осталось на сегодня и из скольких. При перерасходе сумма красная.
          <div className={styles.budget}>
            <span className={cx('t-body-sm', styles.hint)}>
              {over ? 'Сегодня перерасход' : 'Можно потратить сегодня'}
            </span>
            <p className={styles.budgetSum}>
              <span className={cx('t-heading-4', over && styles.over)}>{formatMoney(Math.abs(day.left))}</span>
              {!over && <span className={cx('t-body-sm', styles.hint)}>из {formatMoney(day.budget)}</span>}
            </p>
          </div>
        ))}

      {own.length > 0 ? (
        <ul className={styles.list}>
          {(all ? own : own.slice(0, SHOWN)).map((spend) => (
            <li key={spend.id} className={styles.item}>
              {/* Как строки этапа: нажатие открывает правку и удаление. */}
              <button
                type="button"
                className={styles.row}
                aria-label={`Изменить трату: ${spend.title ?? 'без названия'}, ${formatMoney(spend.amount)}`}
                onClick={() => setEditing(spend)}
              >
                <span className={styles.title}>
                  {spend.title ?? 'Трата'}
                  <span className={`t-caption ${styles.once}`}>{dateLabel(spend.date)}</span>
                </span>
                <span className={styles.sum}>{formatMoney(spend.amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.hint}>Записывай сюда всё остальное: продукты, кофе, такси</p>
      )}
      {own.length > SHOWN && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setAll(!all)}>
            {all ? 'Скрыть' : `Показать все (${own.length})`}
          </Button>
        </div>
      )}

      {adding === 'pad' && (
        <SpendPad
          titles={titles}
          onClose={() => setAdding(undefined)}
          onSave={(amount, title) => {
            onAdd(amount, title)
            setAdding(undefined)
          }}
        />
      )}

      {adding === 'modal' && (
        <SpendModal
          titles={titles}
          onClose={() => setAdding(undefined)}
          onSave={(title, amount) => {
            onAdd(amount, title)
            setAdding(undefined)
          }}
        />
      )}

      {editing && (
        <SpendModal
          spend={editing}
          titles={titles}
          onClose={() => setEditing(undefined)}
          onSave={(title, amount) => {
            onEdit(editing.id, title, amount)
            setEditing(undefined)
          }}
          onDelete={() => {
            onDelete(editing.id)
            setEditing(undefined)
          }}
        />
      )}
    </div>
  )
}
