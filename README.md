# Трекер

Личный веб-трекер недель, задач, целей и привычек.

Прод: https://nstvlsncv-tracker.vercel.app (выкатывается сам при пуше в `main`).

## Запуск

```bash
npm install
cp .env.example .env.local   # и заполнить значениями из Supabase
npm run dev
```

Сайт откроется на http://localhost:5173, витрина компонентов на `/dev`.

## Пользователи

Регистрации в приложении нет. Пользователя заводят в Supabase: Authentication → Users → Add user, галочка Auto Confirm User включена.

Остальное (команды, правила кода, отступления от `SPEC.md`) описано в [CLAUDE.md](CLAUDE.md).
