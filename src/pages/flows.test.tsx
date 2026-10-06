// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import { toISODate, toWeekParam, weekStartISO } from '../lib/dates'
import { shiftDate } from '../lib/metrics'
import { DevPreview } from './DevPreview'

// Сквозные проверки главных сценариев на демо-данных в памяти: трекер открывается целиком,
// как у гостя на /demo, без входа и без базы. Ловят поломки экранов, которых не видят
// тесты расчётов.

beforeAll(() => {
  // В jsdom нет части браузерных возможностей, на которые рассчитывает интерфейс.
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
      onchange: null,
    }) as MediaQueryList
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = Observer as unknown as typeof ResizeObserver
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.animate = () =>
    ({ finished: Promise.resolve(), cancel() {}, onfinish: null }) as unknown as Animation
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function openTracker(path = '') {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/demo${path}`]}>
        <Routes>
          <Route path="/demo/*" element={<DevPreview base="/demo" visitor />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
  return userEvent.setup()
}

describe('трекер на демо-данных', () => {
  it('Главная: открывается и принимает новую задачу', async () => {
    const user = openTracker()
    const section = (await screen.findByRole('heading', { name: 'Задачи на сегодня' })).closest(
      'section',
    ) as HTMLElement

    await user.click(within(section).getByRole('button', { name: 'Добавить задачу' }))
    await user.type(within(section).getByRole('textbox', { name: 'Добавить задачу' }), 'Полить цветы{Enter}')

    expect(await within(section).findByText('Полить цветы')).toBeTruthy()
  })

  it('Главная: отметка задачи меняет счётчик', async () => {
    const user = openTracker()
    const section = (await screen.findByRole('heading', { name: 'Задачи на сегодня' })).closest(
      'section',
    ) as HTMLElement
    // Повторяющаяся задача встаёт в список чуть позже остальных: ждём её, чтобы счёт не плыл.
    await within(section).findByText('Прогулка 30 минут')
    const unchecked = within(section)
      .getAllByRole('checkbox')
      .filter((box) => box.getAttribute('aria-checked') === 'false')
    const before = unchecked.length

    await user.click(unchecked[0])

    await waitFor(() =>
      expect(
        within(section)
          .getAllByRole('checkbox')
          .filter((box) => box.getAttribute('aria-checked') === 'false'),
      ).toHaveLength(before - 1),
    )
  })

  it('Привычки: привычку можно отметить за сегодня', async () => {
    const user = openTracker('/habits')
    const boxes = await screen.findAllByRole('checkbox', { name: /^Отметить за сегодня/ })
    const name = boxes[0].getAttribute('aria-label')!.replace('Отметить за сегодня: ', '')

    await user.click(boxes[0])

    expect(
      await screen.findByRole('checkbox', { name: `Снять отметку за сегодня: ${name}` }),
    ).toBeTruthy()
  })

  it('Финансы: платёж добавляется в этап и отмечается', async () => {
    const user = openTracker('/finance')
    const stage = await screen.findByRole('region', { name: 'Зарплата' })

    await user.click(within(stage).getByRole('button', { name: 'Добавить платёж: зарплата' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByRole('textbox', { name: 'Название' }), 'Страховка')
    await user.type(within(dialog).getByRole('textbox', { name: 'Сумма, ₽' }), '1 500')
    await user.click(within(dialog).getByRole('button', { name: 'Добавить платёж' }))

    expect(await within(stage).findByRole('button', { name: /^Изменить: Страховка, 1.500/ })).toBeTruthy()
    await user.click(within(stage).getByRole('checkbox', { name: 'Отметить: Страховка' }))
    expect(await within(stage).findByRole('checkbox', { name: 'Снять отметку: Страховка' })).toBeTruthy()
  })

  it('Неделя: пустую неделю можно начать с копии прошлой', async () => {
    const nextWeek = shiftDate(weekStartISO(toISODate(new Date())), 7)
    const user = openTracker(`/week/${toWeekParam(nextWeek)}`)

    expect(await screen.findByRole('heading', { name: 'Неделя пока пустая' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Скопировать прошлую неделю' }))

    expect(await screen.findByText('Прошлая неделя скопирована')).toBeTruthy()
    // Цели текущей недели встали в следующую, плашка пустой недели ушла.
    expect(await screen.findByText('Три тренировки')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Неделя пока пустая' })).toBeNull()
  })

  it('Главная: вечером напоминает о неотмеченных привычках', async () => {
    const evening = new Date()
    evening.setHours(20, 0, 0, 0)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(evening)
    openTracker()

    expect(await screen.findByRole('heading', { name: /^Сегодня ещё не отмечен/ })).toBeTruthy()
  })

  it('Главная: днём о привычках не напоминает', async () => {
    const noon = new Date()
    noon.setHours(12, 0, 0, 0)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(noon)
    openTracker()

    await screen.findByRole('heading', { name: 'Привычки сегодня' })
    expect(screen.queryByRole('heading', { name: /^Сегодня ещё не отмечен/ })).toBeNull()
  })

  it('Справка раздела открывается кнопкой у названия', async () => {
    const user = openTracker('/habits')
    await user.click(await screen.findByRole('button', { name: 'Справка: Привычки' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Дела, которые повторяются/)).toBeTruthy()
  })

  it('Меню ведёт по разделам, в Профиле открываются пункты', async () => {
    const user = openTracker()
    await screen.findByRole('heading', { name: 'Задачи на сегодня' })
    const menu = screen.getByRole('navigation', { name: 'Разделы' })

    await user.click(within(menu).getByRole('link', { name: /Неделя/ }))
    expect(await screen.findByRole('heading', { name: 'Неделя', level: 1 })).toBeTruthy()

    await user.click(within(menu).getByRole('link', { name: /Финансы/ }))
    expect(await screen.findByRole('heading', { name: 'Финансы', level: 1 })).toBeTruthy()

    await user.click(within(menu).getByRole('link', { name: /Профиль/ }))
    expect(await screen.findByRole('heading', { name: 'Аккаунт' })).toBeTruthy()

    const settings = screen.getByRole('navigation', { name: 'Настройки профиля' })
    await user.click(within(settings).getByRole('link', { name: /Помощь/ }))
    expect(await screen.findByRole('heading', { name: 'Клавиши на компьютере' })).toBeTruthy()
    await user.click(within(settings).getByRole('link', { name: /Обратная связь/ }))
    expect(await screen.findByRole('link', { name: 'Напиши мне' })).toBeTruthy()
    // В демо для гостей пароль не меняют и аккаунт не удаляют.
    expect(within(settings).queryByRole('link', { name: /Пароль/ })).toBeNull()
  })
})
