import { Plus } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { ConfirmModal } from '../../components/ConfirmModal'
import { Section } from '../../components/Section'
import { Skeleton } from '../../components/Skeleton'
import { useToast } from '../../components/useToast'
import type { Habit } from '../../data/types'
import { useHabits } from '../../data/useHabits'
import { PageHeader } from '../../layout/PageHeader'
import { useSessionState } from '../../lib/sessionState'
import { useToday } from '../../lib/useToday'
import { HabitCard } from './HabitCard'
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
  const [archiveOpen, setArchiveOpen] = useSessionState('habits.archiveOpen', false)
  const [deleting, setDeleting] = useState<Habit>()
  // Привычка, отмеченная последней: если ею закрыты все привычки дня, её чекбокс празднует.
  const [lastChecked, setLastChecked] = useState<string>()

  const checksOf = (habit: Habit) => store.checks[habit.id] ?? NO_CHECKS
  // Не выполненные сегодня сверху, выполненные снизу. Внутри группы по времени создания.
  const habits = [...store.habits].sort(
    (a, b) => Number(checksOf(a).has(today)) - Number(checksOf(b).has(today)),
  )

  const allDoneToday = habits.length > 0 && habits.every((habit) => checksOf(habit).has(today))

  const setCardOpen = (id: string, next: boolean) =>
    setOpen((current) => {
      const ids = new Set(current)
      if (next) ids.add(id)
      else ids.delete(id)
      return ids
    })

  const save = (title: string) => {
    if (editing === 'new') {
      store.addHabit(title)
      toast({ message: 'Привычка добавлена' })
    } else if (editing && title !== editing.title) {
      store.renameHabit(editing.id, title)
      toast({ message: 'Сохранено' })
    }
    setEditing(undefined)
  }

  return (
    <>
      <PageHeader
        title="Привычки"
        actions={
          <Button size="lg" icon={<Plus aria-hidden />} onClick={() => setEditing('new')}>
            Добавить привычку
          </Button>
        }
      />

      {store.status === 'loading' &&
        [0, 1, 2].map((row) => (
          <div key={row} className={styles.skeleton}>
            <Skeleton width={32} height={32} round />
            <div className={styles.skeletonText}>
              <Skeleton width={180} height={24} />
              <Skeleton width={260} />
            </div>
          </div>
        ))}

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
        <p className={styles.placeholder}>Начни с одной привычки, остальные подтянутся</p>
      )}

      {store.status === 'ready' &&
        habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            checks={checksOf(habit)}
            today={today}
            open={open.has(habit.id)}
            onOpenChange={(next) => setCardOpen(habit.id, next)}
            celebrate={allDoneToday && lastChecked === habit.id}
            onToggle={(date, done) => {
              if (date === today) setLastChecked(habit.id)
              store.toggleCheck(habit.id, date, done)
            }}
            onEdit={() => setEditing(habit)}
          />
        ))}

      {store.status === 'ready' && store.archived.length > 0 && (
        <div>
          <Button
            variant="ghost"
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
