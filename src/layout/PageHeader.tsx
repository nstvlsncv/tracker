import { ArrowLeft } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { buttonClassName } from '../components/buttonStyles'
import { HelpButton } from '../components/Help'
import type { HelpTopic } from '../data/help'
import { cx } from '../lib/cx'
import styles from './PageHeader.module.css'

type Props = {
  title: string
  /** Справка раздела: у названия появляется кнопка с вопросом. */
  help?: HelpTopic
  /** Стоит сразу за названием, с отступом 16px (выбор недели). */
  aside?: ReactNode
  /** Кнопки у правого края. */
  actions?: ReactNode
  /**
   * Куда ведёт стрелка «назад» перед названием (адрес относительно текущего). Стрелка есть
   * только на телефоне и только у экранов, которых нет в нижней панели (Профиль).
   */
  backTo?: string
  /** Стрелка «назад» видна на любом экране: у разделов, которых нет и в боковом меню (Итоги). */
  backAlways?: boolean
  /**
   * Стрелка «назад» только на телефоне: у экрана, который на планшете есть в меню, а в нижней
   * панели телефона его нет (список пунктов Профиля, назад на Главную).
   */
  backPhoneOnly?: boolean
}

/**
 * Шапка экрана: название раздела и кнопки. До основного содержимого от неё 24px.
 * На телефоне кнопки тоже стоят в шапке: одна квадратом справа от названия, ряд с выбором
 * недели или месяца под названием.
 */
export function PageHeader({ title, help, aside, actions, backTo, backAlways, backPhoneOnly }: Props) {
  return (
    <header className={styles.header}>
      <div className={cx(styles.title, backAlways && styles.withBack)}>
        {backTo && (
          <Link
            to={backTo}
            relative="path"
            className={cx(
              buttonClassName({ variant: 'ghost', iconOnly: true }),
              styles.back,
              backPhoneOnly && styles.phoneOnly,
            )}
            aria-label="Назад"
          >
            <ArrowLeft aria-hidden />
          </Link>
        )}
        <h1 className="t-heading-1">{title}</h1>
        {help && <HelpButton topic={help} />}
        {aside}
      </div>
      {actions && (
        <div className={styles.actions}>
          {actions}
        </div>
      )}
    </header>
  )
}
