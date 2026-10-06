import { Plus } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { ConfirmModal } from '../../components/ConfirmModal'
import { Mascot } from '../../components/Mascot'
import { PageLoader } from '../../components/PageLoader'
import { Section } from '../../components/Section'
import { useToast } from '../../components/useToast'
import type { Habit, HabitSchedule } from '../../data/types'
import { useHabits } from '../../data/useHabits'
import { PageHeader } from '../../layout/PageHeader'
import { checkBlock, currentPause, isDueOn, scheduleOf } from '../../lib/habits'
import { useSessionState } from '../../lib/sessionState'
import { useToday } from '../../lib/useToday'
import { HabitCard } from './HabitCard'
import { onNewItem } from '../../lib/hotkeys'
import { Kbd } from '../../components/Kbd'
import { HabitModal } from './HabitModal'
import styles from './Habits.module.css'

const NO_CHECKS: ReadonlySet<string> = new Set()
const NONE_OPEN: ReadonlySet<string> = new Set()

/** Экран «Привычки»: список карточек-аккордеонов, добавление, редактирование и архив. */
export function Habits() {
  const store = useHabits()
  const toast = useToast()
  const today = useToday()
  // Раскрытых карточек может быть несколько. Что раскрыто, запоминается на время сеанса:
  // вернувшись в раздел, человек видит его таким, каким оставил.
  const [open, setOpen] = useSessionState<ReadonlySet<string>>('habits.open', NONE_OPEN)
  // Что открыто в модалке: новая привычка или редактирование существующей.
  const [editing, setEditing] = useState<Habit | 'new'>()
  // N на клавиатуре: новая привычка.
  useEffect(() => onNewItem(() => setEditing('new')), [])
  const [archiveOpen, setArchiveOpen] = useSessionState('habits.archiveOpen', false)
  const [deleting, setDeleting] = useState<Habit>()
  // Привычка, отмеченная последней: если ею закрыты все привычки дня, её чекбокс празднует.
  const [lastChecked, setLastChecked] = useState<string>()

  const checksOf = (habit: Habit) => store.checks[habit.id] ?? NO_CHECKS
  // Сверху те, что ждут отметки сегодня, ниже те, которым сегодня отметка не нужна
  // (не их день или норма недели уже набрана), в самом низу выполненные сегодня.
  const groupOf = (habit: Habit) => {
    const checks = checksOf(habit)
    if (checks.has(today)) return 2
    return isDueOn(scheduleOf(habit), checks, today) ? 0 : 1
  }
  const habits = [...store.habits].sort((a, b) => groupOf(a) - groupOf(b))

  // Праздник, когда закрыто всё, что ждало отметки сегодня.
  const allDoneToday =
    habits.some((habit) => groupOf(habit) === 2) && habits.every((habit) => groupOf(habit) !== 0)

  /** Поменять привычку местами с соседкой: той, что стоит рядом в списке на экране. */
  const swap = (index: number, neighbour: number) => {
    const ids = store.habits.map((habit) => habit.id)
    const from = ids.indexOf(habits[index].id)
    const to = ids.indexOf(habits[neighbour].id)
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    store.reorderHabits(ids)
  }
  // Двигать можно только внутри своей группы: выполненные сегодня всегда стоят ниже остальных.
  const sameGroup = (a: number, b: number) =>
    habits[a] && habits[b] && groupOf(habits[a]) === groupOf(habits[b])

  const setCardOpen = (id: string, next: boolean) =>
    setOpen((current) => {
      const ids = new Set(current)
      if (next) ids.add(id)
      else ids.delete(id)
      return ids
    })

  const save = (title: string, schedule: HabitSchedule) => {
    if (editing === 'new') {
      store.addHabit(title, schedule)
      toast({ message: 'Привычка добавлена' })
    } else if (editing) {
      const before = scheduleOf(editing)
      const same =
        title === editing.title &&
        schedule.frequency === before.frequency &&
        schedule.timesPerWeek === before.timesPerWeek &&
        schedule.days.join() === before.days.join()
      if (!same) {
        store.editHabit(editing.id, title, schedule)
        toast({ message: 'Сохранено' })
      }
    }
    setEditing(undefined)
  }

  return (
    <>
      <PageHeader
        title="Привычки"
        help="habits"
        actions={
          <Button size="lg" icon={<Plus aria-hidden />} onClick={() => setEditing('new')}>
            Добавить привычку
            <Kbd>N</Kbd>
          </Button>
        }
      />

      {store.status === 'loading' && <PageLoader />}

      {store.status === 'error' && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Не удалось загрузить привычки</p>
          <div>
            <Button variant="secondary" onClick={store.reload}>
              Повторить
            </Button>
          </div>
        </div>
      )}

      {store.status === 'ready' && habits.length === 0 && (
        <div className={styles.placeholder}>
          <Mascot size={64} />
          <p>Начни с одной привычки, остальные подтянутся</p>
        </div>
      )}

      {store.status === 'ready' &&
        habits.map((habit, index) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            checks={checksOf(habit)}
            today={today}
            open={open.has(habit.id)}
            onOpenChange={(next) => setCardOpen(habit.id, next)}
            celebrate={allDoneToday && lastChecked === habit.id}
            onToggle={(date, done) => {
              // Поставить отметку можно не всегда; снять можно любую.
              const block = done ? checkBlock(scheduleOf(habit), checksOf(habit), date) : null
              if (block) {
                toast({ message: block })
                return
              }
              if (date === today) setLastChecked(habit.id)
              store.toggleCheck(habit.id, date, done)
            }}
            onEdit={() => setEditing(habit)}
            onMoveUp={sameGroup(index, index - 1) ? () => swap(index, index - 1) : undefined}
            onMoveDown={sameGroup(index, index + 1) ? () => swap(index, index + 1) : undefined}
          />
        ))}

      {store.status === 'ready' && store.archived.length > 0 && (
        <div>
          <Button
            variant="secondary"
            aria-expanded={archiveOpen}
            onClick={() => setArchiveOpen(!archiveOpen)}
          >
            Архив ({store.archived.length})
          </Button>
        </div>
      )}

      {archiveOpen && store.archived.length > 0 && (
        <Section title="Архив">
          <ul className={styles.archive}>
            {store.archived.map((habit) => (
              <li key={habit.id} className={styles.archived}>
                <span className={styles.archivedTitle}>{habit.title}</span>
                <div className={styles.archivedActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      store.restoreHabit(habit.id)
                      toast({ message: 'Привычка вернулась в список' })
                    }}
                  >
                    Восстановить
                  </Button>
                  <Button tone="danger" variant="ghost" size="sm" onClick={() => setDeleting(habit)}>
                    Удалить навсегда
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {editing && (
        <HabitModal
          habit={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(undefined)}
          onSave={save}
          onArchive={
            editing === 'new'
              ? undefined
              : () => {
                  store.archiveHabit(editing.id)
                  setEditing(undefined)
                }
          }
          paused={editing !== 'new' && Boolean(currentPause(scheduleOf(editing), today))}
          onPause={
            editing === 'new'
              ? undefined
              : () => {
                  if (currentPause(scheduleOf(editing), today)) {
                    store.resumeHabit(editing.id, today)
                    toast({ message: 'Привычка снова в деле' })
                  } else {
                    store.pauseHabit(editing.id, today)
                    toast({ message: 'Привычка на паузе: серия подождёт' })
                  }
                  setEditing(undefined)
                }
          }
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Удалить привычку навсегда?"
          confirmLabel="Удалить"
          onConfirm={() => {
            store.deleteHabit(deleting.id)
            toast({ message: 'Привычка удалена' })
          }}
          onClose={() => setDeleting(undefined)}
        >
          «{deleting.title}» исчезнет вместе со всей историей. Это действие нельзя отменить.
        </ConfirmModal>
      )}
    </>
  )
}
