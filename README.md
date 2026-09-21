# RecipeHub

Сервис для обмена рецептами и кулинарных блогов. Учебный проект (ИТМО, «Бэкенд-разработка»),
реализованный как набор микросервисов на Node.js + TypeScript.

## Возможности

- Регистрация и вход по JWT, смена пароля, роли (`user` / `admin`).
- Личный кабинет: свои рецепты (включая черновики), сохранённые рецепты.
- Поиск рецептов с фильтрацией по типу блюда, сложности и ингредиентам.
- Страница рецепта: медиа, пошаговые инструкции с медиа.
- Социальные функции: рейтинги, комментарии, лайки комментариев, подписки и персональная лента.

## Архитектура

```text
                        ┌───────────────────────────┐
   HTTP :3000  ────────▶│        api-gateway        │  JWT → x-user-id / x-user-role
                        │  роутинг, лента, Swagger  │
                        └───────┬───────────┬───────┘
                                │           │
                 HTTP /api/internal/*       │ HTTP /api/internal/*
                                ▼           ▼
                        ┌────────────┐  ┌────────────┐
                        │ user :3001 │  │recipe :3002│
                        │  user-db   │  │ recipe-db  │
                        └─────┬──────┘  └─────▲──────┘
                              │  RabbitMQ     │
                              │ user.created  │
                              └ user.deleted ─┘
```

| Сервис        | Порт | Назначение                                   |
| ------------- | ---- | -------------------------------------------- |
| `api-gateway` | 3000 | JWT-аутентификация, проксирование, лента, Swagger |
| `user`        | 3001 | пользователи, авторизация, подписки          |
| `recipe`      | 3002 | рецепты, шаги, комментарии, рейтинги, сохранения |

- **API-шлюз** — единственная точка входа. Проверяет JWT и прокидывает в сервисы заголовки
  `x-user-id` / `x-user-role`. Сервисы `user` и `recipe` доверяют этим заголовкам.
- **recipe → user** — синхронно по HTTP (`/api/internal/users*`), чтобы подмешивать авторов.
- **user → recipe** — асинхронно через RabbitMQ (topic exchange `user-exchange`,
  события `user.created` / `user.deleted`); recipe каскадно удаляет данные удалённого пользователя.
- У каждого сервиса своя БД Postgres (`database-per-service`).
- Маршруты `/api/internal/*` доступны только внутри docker-сети и наружу не проксируются.

## Быстрый старт (Docker)

```bash
docker compose up -d --build

# применить миграции Prisma (один раз после первого запуска)
docker compose exec user-service npx prisma migrate deploy
docker compose exec recipe-service npx prisma migrate deploy
```

После запуска:

- API: <http://localhost:3000/api>
- Swagger UI: <http://localhost:3000/api-docs>
- RabbitMQ UI: <http://localhost:15672> (guest / guest)

## Запуск сервиса локально

```bash
cd services/<service>
npm install
npm start          # tsx src/server.ts
```

Для локального запуска скопируйте `.env.example` в `.env` в каталоге сервиса и при необходимости
поправьте хосты БД/RabbitMQ на `localhost` (порты см. в `docker-compose.yml`).

## Полезные команды

```bash
npm run typecheck                       # tsc --noEmit
npm run prisma:generate                 # после изменения schema.prisma
npm run prisma:migrate                  # prisma migrate deploy (в контейнере)
docker compose logs -f user-service     # логи сервиса
```

## Структура репозитория

```text
services/
  api-gateway/     # шлюз, CommonJS
  user/            # user-service, ESM
  recipe/          # recipe-service, ESM
docs/
  openapi.yaml     # OpenAPI-спецификация публичного и внутреннего API
  postman/         # коллекция Postman с основным сценарием
docker-compose.yml
AGENTS.md          # заметки для ИИ-агентов и разработчиков
```

## Документация API

- `docs/openapi.yaml` — актуальная OpenAPI 3 спецификация (публичные и `internal` маршруты).
- Swagger UI в шлюзе: `/api-docs`.
- Postman: `docs/postman/RecipeHub.postman_collection.json` (регистрация → вход → рецепт →
  шаги → комментарий/лайк → рейтинг → подписка → лента).

## Prisma

Клиент генерируется в `src/generated/prisma` (в git не хранится). После свежего клона или
изменения `schema.prisma`:

```bash
npx prisma generate
```

Миграции контейнерами не применяются автоматически — используйте `prisma migrate deploy`
внутри соответствующего сервисного контейнера. `DATABASE_URL` в `.env` использует docker-хосты
(`user-db`, `recipe-db`), поэтому команды Prisma выполняются в контейнере, а не на хосте.
