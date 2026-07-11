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
