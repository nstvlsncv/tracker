import { CaretDown, CaretUp } from '@phosphor-icons/react'
import { useId } from 'react'
import { Collapse } from '../../components/Collapse'
import { DayPhotoSlot } from '../../components/DayPhotoSlot'
import { Dropdown } from '../../components/Dropdown'
import { YearCalendar } from '../../components/YearCalendar'
import { useDays } from '../../data/useDays'
import { useSessionState } from '../../lib/sessionState'
import card from './HabitCard.module.css'
import history from './HabitHistory.module.css'
import { useHistoryPeriod } from './useHistoryPeriod'

/**
 * Фото дня в Привычках, рядом с настроением: карточка устроена как карточка привычки,
 * серии у неё нет. Свёрнутая: квадрат с фото за сегодня на месте чекбокса (нажатие добавляет
 * или открывает фото). Раскрытая: год маленькими календарями, как история привычки, в клетках
 * миниатюры (год выбирается в списке справа, на телефоне вместо года месяц), в любой прошедший день можно добавить
 * фото задним числом. Пока фото нет в базе, карточки нет.
 */
export function PhotoCard({ today }: { today: string }) {
  const { photos, uploading } = useDays()
  const detailsId = useId()
  const [open, setOpen] = useSessionState('habits.photoOpen', false)
  const dates = Object.keys(photos ?? {}).sort()
  const period = useHistoryPeriod('photo', dates[0] ?? today, today)

  if (!photos) return null

  const has = Boolean(photos[today] || uploading[today])
  // Сколько фото за выбранный период: год на компьютере, месяц на телефоне.
  const inPeriod = dates.filter((date) => date.startsWith(`${period.value}-`)).length
  const unit = period.phone ? 'месяц' : 'год'
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
                {inPeriod > 0 ? `${inPeriod} фото за ${unit}` : `Фото за ${unit} пока нет`}
              </h3>
              <Dropdown
                aria-label="Период"
                size="sm"
                value={period.value}
                onChange={period.onChange}
                options={period.options}
              />
            </div>
            <YearCalendar months={period.months} today={today} renderDay={(date) => <DayPhotoSlot date={date} size="fill" today={date === today} />} />
          </div>
        </div>
      </Collapse>
    </article>
  )
}
