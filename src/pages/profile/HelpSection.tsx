import { Button } from '../../components/Button'
import { HelpText, InstallSteps } from '../../components/Help'
import helpStyles from '../../components/Help.module.css'
import { Section } from '../../components/Section'
import { HELP, HELP_ORDER, HOTKEYS } from '../../data/help'
import { showOnboarding } from '../../lib/onboarding'

/**
 * «Помощь» в Профиле: справка по всем разделам сразу (та же, что открывается кнопкой
 * с вопросом на экране раздела), горячие клавиши и как добавить иконку на телефон.
 */
export function HelpSection() {
  return (
    <>
      <Section title="Знакомство с трекером">
        <p className={helpStyles.note}>Короткий рассказ о главном: тот, что был при первом входе</p>
        <div>
          <Button variant="secondary" onClick={showOnboarding}>
            Показать ещё раз
          </Button>
        </div>
      </Section>
      {HELP_ORDER.map((topic) => (
        <Section key={topic} title={HELP[topic].title}>
          <HelpText topic={topic} />
        </Section>
      ))}
      <Section title="Клавиши на компьютере">
        <dl className={helpStyles.keys}>
          {HOTKEYS.map(({ keys, action }) => (
            <div key={keys} className={helpStyles.key}>
              <dt className={`t-caption ${helpStyles.keyName}`}>{keys}</dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Иконка на экране телефона">
        <InstallSteps />
      </Section>
    </>
  )
}
