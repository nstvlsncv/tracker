import { CaretDown, CaretUp } from '@phosphor-icons/react'
import { useId } from 'react'
import { Collapse } from '../../components/Collapse'
import { DayPhotoSlot } from '../../components/DayPhotoSlot'
import { Dropdown } from '../../components/Dropdown'
import { YearCalendar } from '../../components/YearCalendar'
import { useDays } from '../../data/useDays'
import { historyYears } from '../../lib/habitHistory'
import { useSessionState } from '../../lib/sessionState'
import card from './HabitCard.module.css'
import history from './HabitHistory.module.css'

/**
 * Фото дня в Привычках, рядом с настроением: карточка устроена как карточка привычки,
 * серии у неё нет. Свёрнутая: квадрат с фото за сегодня на месте чекбокса (нажатие добавляет
 * или открывает фото). Раскрытая: год маленькими календарями, как история привычки, в клетках
 * миниатюры 24px (год выбирается в списке справа), в любой прошедший день можно добавить
 * фото задним числом. Пока фото нет в базе, карточки нет.
 */
export function PhotoCard({ today }: { today: string }) {
  const { photos, uploading } = useDays()
  const detailsId = useId()
  const [open, setOpen] = useSessionState('habits.photoOpen', false)
  const [year, setYear] = useSessionState('photo.year', Number(today.slice(0, 4)))

  if (!photos) return null

  const has = Boolean(photos[today] || uploading[today])
  const dates = Object.keys(photos).sort()
  const inYear = dates.filter((date) => date.startsWith(`${year}-`)).length
  const years = historyYears(dates[0] ?? today, today)
  const Caret = open ? CaretUp : CaretDown

  return (
    <article className={card.card}>
      <div className={card.head} onClick={() => setOpen(!open)}>
        {/* Нажатие на квадрат добавляет или открывает фото, а не раскрывает карточку. */}
        <span className={card.mood} onClick={(event) => event.stopPropagation()}>
          <DayPhotoSlot date={today} size={32} />
        </span>
        <div className={card.text}>
          <button
            type="button"
            className={`t-heading-5 ${card.title}`}
            aria-expanded={open}
            aria-controls={detailsId}
          >
            Фото дня
          </button>
          <span className={`t-body-md ${card.streak}`}>
            {has ? 'Сегодня уже есть фото' : 'Сегодня ещё нет фото'}
          </span>
        </div>
        <Caret className={card.caret} aria-hidden />
      </div>

      <Collapse open={open}>
        <div id={detailsId} className={card.details}>
          <div className={history.card}>
            <div className={history.header}>
              <h3 className={`t-body-md ${history.title}`}>
                {inYear > 0 ? `${inYear} фото за год` : 'Фото за год пока нет'}
              </h3>
              <Dropdown
                aria-label="Год"
                size="sm"
                value={String(year)}
                onChange={(value) => setYear(Number(value))}
                options={years.map((value) => ({ value: String(value), label: `${value} год` }))}
              />
            </div>
            <YearCalendar year={year} today={today} renderDay={(date) => <DayPhotoSlot date={date} size="fill" today={date === today} />} />
          </div>
        </div>
      </Collapse>
    </article>
  )
}
