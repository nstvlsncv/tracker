import { PencilSimple, Plus } from '@phosphor-icons/react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { AddItem } from '../components/AddItem'
import { Button } from '../components/Button'
import { Checkbox } from '../components/Checkbox'
import { Donut } from '../components/Donut'
import { Dropdown } from '../components/Dropdown'
import { IconButton } from '../components/IconButton'
import { Input } from '../components/Input'
import { ItemList } from '../components/ItemList'
import type { Item } from '../components/ItemList'
import { Modal } from '../components/Modal'
import { StatCard } from '../components/StatCard'
import { useToast } from '../components/useToast'
import { UNDO_TOAST_DURATION_MS } from '../lib/constants'
import styles from './Showcase.module.css'

// Витрина базовых компонентов. Открывается по адресу /dev, только в режиме разработки.

const TEXT_STYLES = [
  'heading-1',
  'heading-2',
  'heading-3',
  'heading-4',
  'heading-5',
  'body-lg',
  'body-md',
  'body-sm',
  'button',
  'caption',
]

const BUTTON_STYLES = [
  { label: 'accent main', props: { tone: 'accent', variant: 'main' } },
  { label: 'accent secondary', props: { tone: 'accent', variant: 'secondary' } },
  { label: 'accent ghost', props: { tone: 'accent', variant: 'ghost' } },
  { label: 'danger main', props: { tone: 'danger', variant: 'main' } },
  { label: 'danger ghost', props: { tone: 'danger', variant: 'ghost' } },
] as const

const INITIAL_ITEMS: Item[] = [
  { id: '1', title: 'Сдать отчёт за квартал', isDone: false, createdAt: '2026-09-15T08:00:00Z' },
  { id: '2', title: 'Записаться к врачу', isDone: true, createdAt: '2026-09-15T08:05:00Z' },
  { id: '3', title: 'Купить билеты на поезд', isDone: false, createdAt: '2026-09-15T08:10:00Z' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className="t-heading-5">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      {label && <span className={`t-caption ${styles.rowLabel}`}>{label}</span>}
      {children}
    </div>
  )
}

export function Showcase() {
  const toast = useToast()
  const [items, setItems] = useState(INITIAL_ITEMS)
  const [checks, setChecks] = useState({ first: false, second: true })
  const [modal, setModal] = useState<'edit' | 'delete' | null>(null)
  const [password, setPassword] = useState('')
  const [year, setYear] = useState('2026')

  const addItem = (title: string) =>
    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), title, isDone: false, createdAt: new Date().toISOString() },
    ])

  const deleteItem = (id: string) => {
    const removed = items.find((item) => item.id === id)
    if (!removed) return
    setItems((current) => current.filter((item) => item.id !== id))
    toast({
      message: 'Задача удалена',
      duration: UNDO_TOAST_DURATION_MS,
      action: { label: 'Отменить', onClick: () => setItems((current) => [...current, removed]) },
    })
  }

  return (
    <main className={styles.page}>
      <h1 className="t-heading-1">Компоненты</h1>

      <Section title="Button">
        {BUTTON_STYLES.map((style) => (
          <Row key={style.label} label={style.label}>
            <Button {...style.props} size="sm" icon={<Plus aria-hidden />}>
              32
            </Button>
            <Button {...style.props} icon={<Plus aria-hidden />}>
              40
            </Button>
            <Button {...style.props} size="lg" icon={<Plus aria-hidden />}>
              48
            </Button>
            <Button {...style.props} pending>
              Pending
            </Button>
            <Button {...style.props} disabled>
              Disabled
            </Button>
          </Row>
        ))}
      </Section>

      <Section title="IconButton">
        {BUTTON_STYLES.map((style) => (
          <Row key={style.label} label={style.label}>
            <IconButton {...style.props} size="sm" icon={<PencilSimple aria-hidden />} aria-label="32" />
            <IconButton {...style.props} icon={<PencilSimple aria-hidden />} aria-label="40" />
            <IconButton {...style.props} size="lg" icon={<PencilSimple aria-hidden />} aria-label="48" />
            <IconButton {...style.props} pending icon={<PencilSimple aria-hidden />} aria-label="Pending" />
            <IconButton {...style.props} disabled icon={<PencilSimple aria-hidden />} aria-label="Disabled" />
          </Row>
        ))}
      </Section>

      <Section title="Checkbox">
        <Row>
          <Checkbox
            checked={checks.first}
            onChange={(first) => setChecks({ ...checks, first })}
            aria-label="Не отмечен"
          />
          <Checkbox
            checked={checks.second}
            onChange={(second) => setChecks({ ...checks, second })}
            aria-label="Отмечен"
          />
          <Checkbox checked={false} onChange={() => {}} disabled aria-label="Недоступен" />
          <Checkbox checked onChange={() => {}} disabled aria-label="Недоступен, отмечен" />
        </Row>
      </Section>

      <Section title="Список и добавление">
        <ItemList
          items={items}
          onToggle={(id, isDone) =>
            setItems((current) => current.map((item) => (item.id === id ? { ...item, isDone } : item)))
          }
          onRename={(id, title) =>
            setItems((current) => current.map((item) => (item.id === id ? { ...item, title } : item)))
          }
          onDelete={deleteItem}
        />
        <AddItem label="Добавить задачу" onAdd={addItem} />
      </Section>

      <Section title="Input">
        <div className={styles.grid}>
          <Input label="Email" type="email" placeholder="name@example.com" />
          <Input label="Имя" defaultValue="Настя" />
          <Input label="Email" type="email" defaultValue="name@example" error="Проверь email" />
          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input label="Недоступно" defaultValue="Нельзя изменить" disabled />
        </div>
      </Section>

      <Section title="Donut">
        <Row>
          <Donut value={0} />
          <Donut value={40} />
          <Donut value={100} />
          <Donut value={null} />
          <Donut value={72} size="lg" />
          <Donut value={67} size="xl" />
        </Row>
      </Section>

      <Section title="Stat card">
        <div className={styles.stats}>
          <StatCard value="67%" label="прогресс дня" variant="inverse" />
          <StatCard value="1/4" label="цели недели" />
          <StatCard value="ПН" label="лучший день" />
          <StatCard value="12" label="текущая серия" variant="surface" />
          <StatCard value="Каждый день" label="цель" variant="surface" />
        </div>
      </Section>

      <Section title="Dropdown">
        <Row>
          <Dropdown
            aria-label="Год"
            align="start"
            options={[
              { value: '2025', label: '2025' },
              { value: '2026', label: '2026' },
            ]}
            value={year}
            onChange={setYear}
          />
        </Row>
      </Section>

      <Section title="Modal и toast">
        <Row>
          <Button variant="secondary" onClick={() => setModal('edit')}>
            Открыть модалку
          </Button>
          <Button variant="secondary" onClick={() => setModal('delete')}>
            Открыть подтверждение
          </Button>
          <Button variant="secondary" onClick={() => toast({ message: 'Сохранено' })}>
            Показать toast
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                message: 'Привычка в архиве',
                action: { label: 'Отменить', onClick: () => toast({ message: 'Привычка возвращена' }) },
              })
            }
          >
            Toast с отменой
          </Button>
        </Row>
      </Section>

      <Section title="Типографика">
        {TEXT_STYLES.map((style) => (
          <div key={style} className={styles.typeRow}>
            <span className={`t-caption ${styles.rowLabel}`}>{style}</span>
            <span className={`t-${style}`}>Сегодня вторник, задачи на неделю</span>
          </div>
        ))}
        <div className={styles.typeRow}>
          <span className={`t-caption ${styles.rowLabel}`}>number-lg</span>
          <span className="t-number-lg">72% · 5/7 · 14</span>
        </div>
        <div className={styles.typeRow}>
          <span className={`t-caption ${styles.rowLabel}`}>number-sm</span>
          <span className="t-number-sm">72% · 5/7 · 14</span>
        </div>
      </Section>

      <Modal
        open={modal === 'edit'}
        title="Изменить аккаунт"
        onClose={() => setModal(null)}
        footerStart={<Button variant="ghost">Архивировать</Button>}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Отмена
            </Button>
            <Button onClick={() => setModal(null)}>Сохранить</Button>
          </>
        }
      >
        <Input label="Имя" defaultValue="Настя" />
        <Input label="Email" type="email" defaultValue="name@example.com" />
      </Modal>

      <Modal
        open={modal === 'delete'}
        title="Удалить аккаунт?"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Отмена
            </Button>
            <Button tone="danger" onClick={() => setModal(null)}>
              Удалить
            </Button>
          </>
        }
      >
        <p>Это действие нельзя отменить.</p>
      </Modal>
    </main>
  )
}
