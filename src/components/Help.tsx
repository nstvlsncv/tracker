import { Question } from '@phosphor-icons/react'
import { useState } from 'react'
import { HELP, INSTALL_STEPS, PHONES, detectPhone } from '../data/help'
import type { HelpTopic } from '../data/help'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { Modal } from './Modal'
import { Segmented } from './Segmented'
import styles from './Help.module.css'

/** Справка раздела: что это и как пользоваться. Текст лежит в `src/data/help.ts`. */
export function HelpText({ topic }: { topic: HelpTopic }) {
  const { intro, tips } = HELP[topic]
  return (
    <>
      <p className={styles.intro}>{intro}</p>
      <ul className={styles.tips}>
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </>
  )
}

/** Шаги с номерами в кружках. */
export function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className={styles.steps}>
      {steps.map((step, index) => (
        <li key={step} className={styles.step}>
          <span className={`t-caption ${styles.number}`}>{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  )
}

/** Как добавить иконку трекера на экран телефона: переключатель iPhone / Android и шаги. */
export function InstallSteps() {
  const [phone, setPhone] = useState(detectPhone)
  return (
    <>
      <Segmented aria-label="Телефон" options={PHONES} value={phone} onChange={(value) => setPhone(value)} />
      <Steps steps={INSTALL_STEPS[phone]} />
      <p className={`t-body-sm ${styles.note}`}>
        Иконка появится рядом с остальными приложениями, а трекер будет открываться без панелей
        браузера
      </p>
    </>
  )
}

/** Кнопка с вопросом у названия раздела: открывает окно с его справкой. */
export function HelpButton({ topic }: { topic: HelpTopic }) {
  const [open, setOpen] = useState(false)
  const { title } = HELP[topic]
  return (
    <>
      <IconButton
        variant="secondary"
        size="sm"
        className={styles.button}
        icon={<Question aria-hidden />}
        aria-label={`Справка: ${title}`}
        onClick={() => setOpen(true)}
      />
      {open && (
        <Modal
          open
          title={title}
          onClose={() => setOpen(false)}
          footer={<Button onClick={() => setOpen(false)}>Понятно</Button>}
        >
          <HelpText topic={topic} />
        </Modal>
      )}
    </>
  )
}
