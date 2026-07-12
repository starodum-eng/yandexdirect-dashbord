# Дашборд Яндекс.Директ для агентства

Веб-дашборд сводной статистики по нескольким рекламным кабинетам Яндекс.Директ.

## Стек

- **Next.js 15** (App Router) + **TypeScript**
- **PostgreSQL** + **Prisma**
- **Tailwind CSS**
- **NextAuth v5** (Auth.js), Credentials provider (логин/пароль)
- **Яндекс.Директ API v5**, сервис `reports` (`CUSTOM_REPORT`, формат TSV)

## Возможности

- Страница логина; доступ к дашборду только после входа (middleware + защита layout).
- Сводная статистика по всем кабинетам: показы, клики, расход, CTR, конверсии.
- Фильтр по датам и по конкретному кабинету.
- Таблица кампаний с сортировкой по любой колонке.
- Кэширование отчётов в БД (снапшоты) с TTL; кнопка «Обновить данные» и
  эндпоинт для обновления по расписанию (cron).

## Безопасность токенов

Токены кабинетов Яндекс.Директ хранятся **только** в переменной окружения
`YANDEX_ACCOUNTS` — не в коде и не в БД. Токены читаются исключительно на
сервере (route handlers и серверные модули) и никогда не попадают в браузер.

## Установка

1. Установите зависимости:

   ```bash
   npm install
   ```

2. Создайте `.env` на основе `.env.example` и заполните значения:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — строка подключения к PostgreSQL.
   - `AUTH_SECRET` — `openssl rand -base64 32`.
   - `YANDEX_ACCOUNTS` — JSON-массив кабинетов (`id`, `label`, `token`).
   - `CACHE_TTL_MINUTES` — свежесть кэша в минутах (по умолчанию 60).
   - `CRON_SECRET` — токен для эндпоинта обновления по расписанию (опционально).
   - `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` — учётка для сид-скрипта.

3. Примените миграции и создайте пользователя:

   ```bash
   npm run db:migrate      # создаёт таблицы
   npm run db:seed         # создаёт пользователя из SEED_USER_*
   ```

4. Запустите:

   ```bash
   npm run dev
   ```

   Откройте http://localhost:3000 — вас перенаправит на `/login`.

## Обновление по расписанию (cron)

Эндпоинт `GET /api/cron/refresh` принудительно обновляет кэш всех кабинетов
за текущий месяц. Защищён заголовком `Authorization: Bearer $CRON_SECRET`.

Пример системного crontab (раз в час):

```
0 * * * * curl -s -H "Authorization: Bearer <CRON_SECRET>" https://<host>/api/cron/refresh
```

## Деплой на Vercel

Проект готов к деплою на Vercel: `prisma generate` выполняется автоматически
(в `postinstall` и в `build`-скрипте), а роуты `/api/stats` и `/api/cron/refresh`
помечены `export const dynamic = "force-dynamic"`, поэтому Next.js не пытается
кэшировать их на этапе билда.

### 1. Переменные окружения

Задайте в **Vercel → Project → Settings → Environment Variables** (для окружений
Production и Preview):

| Переменная | Обязательна | Назначение |
| --- | --- | --- |
| `DATABASE_URL` | да | Строка подключения к PostgreSQL. Используйте managed-БД (Vercel Postgres, Neon, Supabase и т.п.). Для serverless желательна строка с pooling. |
| `AUTH_SECRET` | да | Секрет NextAuth. Сгенерируйте: `openssl rand -base64 32`. |
| `AUTH_URL` | да | Публичный URL приложения, напр. `https://<project>.vercel.app`. |
| `YANDEX_ACCOUNTS` | да | JSON-массив кабинетов `[{"id","label","token"}]`. Токены живут только здесь. |
| `CACHE_TTL_MINUTES` | нет | Свежесть кэша в минутах (по умолчанию 60). |
| `CRON_SECRET` | нет | Bearer-токен для `GET /api/cron/refresh`. Нужен, если настраиваете обновление по расписанию. |

> `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_NAME` нужны только для
> разового запуска сид-скрипта (см. ниже), в рантайме приложения не используются.

### 2. Разовая инициализация БД после первого деплоя

Миграции и создание пользователя выполняются **один раз** вручную — Vercel их
автоматически не запускает. Есть два способа.

**Вариант A — Vercel CLI (тянет переменные окружения из проекта):**

```bash
npm i -g vercel
vercel link                       # привязать локальную папку к проекту Vercel
vercel env pull .env.production   # скачать переменные окружения в файл

# применить миграции и создать пользователя, используя эти переменные:
dotenv -e .env.production -- npx prisma migrate deploy
dotenv -e .env.production -- npm run db:seed
# (dotenv-cli: npm i -g dotenv-cli; либо просто заэкспортируйте переменные вручную)
```

**Вариант B — локально против production-БД:**

```bash
# подставьте строку подключения к вашей production-базе и учётку сид-пользователя
export DATABASE_URL="postgresql://…"     # production
export SEED_USER_EMAIL="admin@example.com"
export SEED_USER_PASSWORD="…"

npx prisma migrate deploy    # накатывает миграции из prisma/migrations
npm run db:seed              # создаёт пользователя (bcrypt)
```

При последующих деплоях с новыми миграциями снова выполните `prisma migrate deploy`
(шаг `db:seed` повторять не нужно — он идемпотентен и лишь обновит существующего
пользователя).

### 3. Таймауты (`vercel.json`)

Отчёты Reports API готовятся асинхронно (ответы 201/202 с повторными запросами),
поэтому `/api/stats` и `/api/cron/refresh` могут выполняться дольше дефолтных
10 секунд. В `vercel.json` для них поднят `maxDuration` до **60** секунд:

```json
{
  "functions": {
    "src/app/api/stats/route.ts": { "maxDuration": 60 },
    "src/app/api/cron/refresh/route.ts": { "maxDuration": 60 }
  }
}
```

Лимит зависит от тарифа: на **Hobby** максимум 60 секунд, на **Pro** — до 300.
Если на Pro отчёты по-прежнему не успевают, увеличьте значение (напр. `300`).

### 4. Обновление по расписанию через Vercel Cron (опционально)

Вместо системного crontab можно использовать [Vercel Cron](https://vercel.com/docs/cron-jobs).
Добавьте в `vercel.json` секцию `crons` — Vercel сам будет дёргать эндпоинт по
расписанию и передавать заголовок авторизации из `CRON_SECRET`:

```json
{
  "crons": [{ "path": "/api/cron/refresh", "schedule": "0 * * * *" }]
}
```

## Структура проекта

```
prisma/
  schema.prisma          # User + ReportSnapshot (кэш)
  seed.ts                # сид пользователя (bcrypt)
src/
  app/
    login/               # страница логина
    (dashboard)/         # защищённые страницы
      page.tsx           #   сводка + фильтры
      campaigns/page.tsx #   таблица кампаний
    api/
      auth/[...nextauth] # NextAuth
      stats/             # агрегированная статистика (с кэшем)
      cron/refresh/      # обновление кэша по расписанию
  lib/
    auth.ts              # конфиг NextAuth
    prisma.ts            # singleton Prisma
    accounts.ts          # чтение кабинетов из ENV (zod)
    stats.ts             # кэш-сервис (снапшоты в БД)
    yandex/
      client.ts          # запрос к Reports API (обработка 201/202)
      report.ts          # парсинг TSV, агрегация, CTR
  components/            # UI (фильтры, карточки, таблицы)
  hooks/useStats.ts      # загрузка статистики на клиенте
  types/yandex.ts        # общие типы
middleware.ts            # защита маршрутов
```
