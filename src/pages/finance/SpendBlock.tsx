import { Trash } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/Button'
import { IconButton } from '../../components/IconButton'
import { Input } from '../../components/Input'
import type { FinanceSpend } from '../../data/finance'
import { cx } from '../../lib/cx'
import { formatDayMonth } from '../../lib/dates'
import { dayBudget, formatMoney, parseAmount, spendsIn, spentIn } from '../../lib/finance'
import type { StagePeriod } from '../../lib/finance'
import { pluralize, shiftDate } from '../../lib/metrics'
import { SpendPad } from './SpendPad'
import styles from './Finance.module.css'

type Props = {
  period: StagePeriod
  /** Этап идёт сейчас: в нём записывают траты и считается, сколько можно потратить сегодня. */
  current: boolean
  /** Свободные деньги этапа до трат: поступления минус платежи и накопления. */
  free: number
  /** Поступлений в этапе ещё нет: считать нечего, блок подсказывает, что вписать. */
  noIncome: boolean
  spends: FinanceSpend[]
  today: string
  onAdd: (amount: number) => void
  onDelete: (id: string) => void
}

/** Сколько трат видно сразу, остальные открывает кнопка. */
const SHOWN = 5

/**
 * «Прочие расходы» внутри этапа: четвёртый список после поступлений, платежей и накоплений.
 * Трата это сумма без названия и категории. В этапе, который идёт сейчас, сверху стоит,
 * сколько можно потратить сегодня и из чего это число получилось, и ввод суммы: на компьютере
 * и планшете поле, на телефоне кнопка открывает клавиатуру-калькулятор. В прошедшем этапе
 * остаётся только список его трат.
 */
export function SpendBlock({ period, current, free, noIncome, spends, today, onAdd, onDelete }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string>()
  const [padOpen, setPadOpen] = useState(false)
  const [all, setAll] = useState(false)

  const own = spendsIn(spends, period)
  // В прошедшем или будущем этапе без трат показывать нечего.
  if (!current && own.length === 0) return null

  const day = dayBudget(free, spends, period, today)
  const over = day.left < 0

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const amount = parseAmount(text)
    if (amount === null) {
      setError('Нужна сумма цифрами, например 350')
      return
    }
    onAdd(amount)
    setText('')
  }

  const dateLabel = (date: string) =>
    date === today ? 'Сегодня' : date === shiftDate(today, -1) ? 'Вчера' : formatDayMonth(parseISO(date))

  return (
    <div className={styles.group} role="group" aria-label="Прочие расходы">
      <div className={styles.groupHeader}>
        <h3 className={`t-caption ${styles.groupTitle}`}>Прочие расходы</h3>
        {own.length > 0 && (
          <span className={`t-caption ${styles.groupTitle}`}>{formatMoney(spentIn(spends, period))}</span>
        )}
      </div>

      {current && (
        <div className={styles.spendToday}>
          <p className={`t-body-sm ${styles.hint}`}>
            {over ? 'Сегодня перерасход' : 'Сегодня можно потратить'}
          </p>
          <p className={cx('t-heading-3', styles.spendLeft, over && styles.over)}>
            {formatMoney(Math.abs(day.left))}
          </p>
          {noIncome ? (
            <p className={`t-body-sm ${styles.hint}`}>
              Впиши поступления этапа, и трекер посчитает, сколько можно тратить в день
            </p>
          ) : (
            // Из чего получилось число: остаток этапа, делённый на оставшиеся дни, минус сегодняшнее.
            <dl className={`t-body-sm ${styles.math}`}>
              <div>
                <dt>Осталось до конца этапа</dt>
                <dd>{formatMoney(day.pool)}</dd>
              </div>
              <div>
                <dt>
                  Делим на {day.days} {pluralize(day.days, 'день', 'дня', 'дней')}
                </dt>
                <dd>{formatMoney(day.budget)} в день</dd>
              </div>
              <div>
                <dt>Сегодня уже потрачено</dt>
                <dd>{formatMoney(day.spentToday)}</dd>
              </div>
              {/* Перерасход вычитается из следующих дней: сразу видно, во что он обойдётся. */}
              {over && day.tomorrow !== null && (
                <div>
                  <dt>Завтра будет</dt>
                  <dd>{formatMoney(day.tomorrow)} в день</dd>
                </div>
              )}
            </dl>
          )}

          {/* Компьютер и планшет: сумма печатается в поле, Enter записывает. */}
          <form className={styles.spendForm} onSubmit={submit} noValidate>
            <Input
              label="Трата, ₽"
              inputMode="decimal"
              autoComplete="off"
              value={text}
              error={error}
              onChange={(event) => {
                setText(event.target.value)
                setError(undefined)
              }}
            />
            <Button type="submit" size="lg">
              Записать
            </Button>
          </form>
          {/* Телефон: кнопка открывает клавиатуру-калькулятор. */}
          <div className={styles.spendOpen}>
            <Button size="lg" onClick={() => setPadOpen(true)}>
              Записать трату
            </Button>
          </div>
        </div>
      )}

      {own.length > 0 ? (
        <ul className={styles.list}>
          {(all ? own : own.slice(0, SHOWN)).map((spend) => (
            <li key={spend.id} className={styles.spendRow}>
              <span className={styles.title}>{dateLabel(spend.date)}</span>
              <span className={styles.sum}>{formatMoney(spend.amount)}</span>
              <IconButton
                tone="danger"
                variant="ghost"
                size="sm"
                icon={<Trash aria-hidden />}
                aria-label={`Удалить трату: ${dateLabel(spend.date).toLowerCase()}, ${formatMoney(spend.amount)}`}
                onClick={() => onDelete(spend.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.hint}>Сюда записывается всё остальное: продукты, кофе, такси</p>
      )}
      {own.length > SHOWN && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setAll(!all)}>
            {all ? 'Скрыть' : `Показать все (${own.length})`}
          </Button>
        </div>
      )}

      {padOpen && (
        <SpendPad
          onClose={() => setPadOpen(false)}
          onSave={(amount) => {
            onAdd(amount)
            setPadOpen(false)
          }}
        />
      )}
    </div>
  )
}
