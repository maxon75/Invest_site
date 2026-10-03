# Stock Level-1 Tracker

Сайт-трекер американских акций (NYSE/NASDAQ) с двумя листами (watchlist / purchased)
и аналитическим агентом.

## Логика работы

1. **При добавлении тикера** — агент ОДИН раз проводит проверку по чек-листу
   «Уровень 1» (8 критериев): вердикт (PASS / PASS_WITH_WARNINGS / FAIL), ключевые
   цифры, краткие тезисы, почему ожидается рост. Результат — в карточке тикера.
2. **Тезис** — редактируемое поле карточки (авто из чек-листа или ручной).
3. **Непрерывный мониторинг** новостей и отчётов; в карточке — дата следующего отчёта.
4. **После отчёта / важной новости** — LLM оценивает влияние на текущий тезис
   (подтверждает / ломает / глобально не влияет) → датированная пометка в карточке.
5. **Очень важное изменение** (критичность = высокая) → уведомление в Telegram.

## Статус проекта

- [x] Архитектура и план согласованы → [`docs/architecture.md`](docs/architecture.md)
- [x] Промпт чек-листа «Уровень 1» → [`prompts/level1-checklist.md`](prompts/level1-checklist.md)
- [x] Промпт анализа влияния на тезис → [`prompts/thesis-impact.md`](prompts/thesis-impact.md)
- [ ] Реализация начата: созданы npm workspaces, apps/web, apps/api, схема Prisma, PostgreSQL Compose, каркас авторизации и API, интерфейс и Groq-провайдер. Генерация Prisma Client, миграции, адаптеры рыночных данных, конвейер анализа, мониторинг и запуск ещё не выполнены.

## Стек (бесплатно, просто)

- **Фронтенд:** React 18 + Vite + TypeScript + Tailwind + Zustand
- **Бэкенд:** Next.js (API route handlers) + Prisma + PostgreSQL
- **Данные:** `yahoo-finance2` (цены, новости, фундаментал, earnings)
- **LLM:** `openai` SDK (OpenAI-совместимый). По умолчанию **OpenRouter** (бесплатный Qwen);
  переключение на Ollama / GPT через `.env` (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`).
- **Планировщик:** `node-cron` + `instrumentation.ts`
- **Уведомления:** Telegram Bot API
- **Тесты:** Vitest + React Testing Library + Playwright
- **Монорепо:** npm workspaces

## Структура (целевая)

```
Invest_site/
├── prompts/            # промпты (level1-checklist.md, thesis-impact.md)
├── docs/               # architecture.md, api.md, data-model.md
├── apps/
│   ├── web/            # фронтенд (Vite + React 18)
│   └── api/            # бэкенд (Next.js + Prisma + PostgreSQL)
├── packages/shared/    # общие TS-типы
└── docker/             # docker-compose (PostgreSQL)
```

Подробная структура папок, модель данных (Prisma), API и конвейеры — в
[`docs/architecture.md`](docs/architecture.md).

## Как возобновить разработку

1. Открыть папку `Invest_site` в VSCode.
2. Прочитать [`docs/architecture.md`](docs/architecture.md) (полный план) и
   список задач (todo).
3. Начать с **Фазы 0**: каркас монорепо (npm workspaces), `apps/web`, `apps/api`,
   `packages/shared`, PostgreSQL через `docker/docker-compose.yml`, Prisma schema + миграции.

## Конфигурация (заполнить в `.env` при реализации)

- `DATABASE_URL` — PostgreSQL
- `LLM_BASE_URL` (дефолт `https://openrouter.ai/api/v1`), `LLM_API_KEY`, `LLM_MODEL`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (создать бота через @BotFather)
- частота мониторинга (дефолт — каждый час)
## Дополнительные требования

- Пользователь регистрируется по логину и паролю; его акции, тезисы, анализы и заметки доступны только ему.
- Каждый пользователь персонально привязывает Telegram для получения своих уведомлений.
- Акции выбираются кнопками с названием компании и тикером. Их цвет отражает последний анализ тезиса: зелёный — подтверждение, серый — нейтральный результат, красный — тезис сломан. Нейтральное событие меняет цвет на серый, если после последней смены цвета прошло более 7 дней.
- Карточка акции содержит группы **Valuation (7)**, **Profitability (5)**, **Stability (3)** и **Risk & market (3)** с метриками, перечисленными в [docs/architecture.md](docs/architecture.md). Финансовые значения обновляются после отчёта компании; актуальная цена обновляется отдельно каждые 5–10 минут.
- Новости проверяются ежедневно в 08:00, 12:00, 16:00 и 20:00. Если цена изменилась более чем на 7% относительно закрытия предыдущего торгового дня, система проверяет новости и отправляет пользователю сообщение в Telegram с движением цены и возможной причиной.

## Local development

Requirements: Node.js/npm and Docker Desktop.

1. Copy `apps/api/.env.example` to `apps/api/.env` and `apps/web/.env.example` to `apps/web/.env`.
2. Start PostgreSQL: `npm run db:up`.
3. Install workspace dependencies: `npm install`.
4. Generate Prisma Client and apply the initial schema: `npm run db:generate --workspace @stock-level1/api`, then `npm run db:migrate --workspace @stock-level1/api`.
5. In separate terminals run `npm run dev:api` and `npm run dev:web`.
6. Run checks with `npm test` and `npm run build`.

The Groq key is optional for the current scaffold; set `GROQ_API_KEY` in `apps/api/.env` before enabling AI analysis.
