# AGENTS.md

Recipe-sharing microservices monorepo. No root package.json — each service and `tests/` is independent.
Human-facing overview: `README.md`. API contract: `docs/openapi.yaml`.

## Примерное ТЗ для данного сервиса

Сервис для обмена рецептами и кулинарных блогов

- Вход
- Регистрация
- Личный кабинет пользователя (сохранённые рецепты, публикации)
- Поиск рецептов с фильтрацией по типу блюда, сложности, ингредиентам
- Страница рецепта с фото, пошаговыми инструкциями и видео
- Социальные функции (рейтинги рецептов, комментарии к рецептам, лайки комментариев, подписки на кулинаров)

Также дополнительную информацию по сервису можно найти в `README.md`.

## Services

| Service | Dir | Port | Module | Purpose |
|---|---|---|---|---|
| api-gateway | `services/api-gateway` | 3000 | CommonJS | JWT auth, routing, feed composition, Swagger UI |
| user | `services/user` | 3001 | ESM | auth, users, subscriptions |
| recipe | `services/recipe` | 3002 | ESM | recipes, steps, comments, ratings, saved recipes |

Postgres per DB (`user-db` host port 5433, `recipe-db` 5434) and RabbitMQ (`rabbitmq`, 5672 / UI 15672). See `docker-compose.yml`.

## Commands

Run from repo root unless noted.

- Full stack: `docker compose up -d --build`
- One service: `docker compose up -d --build user-service`
- Logs: `docker compose logs -f <service>`
- Prisma Studio: `docker compose --profile prisma-studio up -d --build` (user 5555, recipe 5556)
- Manual run inside a service dir: `npm start` (executes `tsx src/server.ts`, no build step)
- Typecheck a service (requires `npx prisma generate` first): `npm run typecheck`
  (= `npx tsc --noEmit`) in a service dir.
- E2E tests (see "Tests" below): `cd tests && npm install && npm test`, or one-shot `npm run test:stack`.
- Prisma: `npm run prisma:generate`, `npm run prisma:migrate` (`migrate deploy`).
- Swagger UI: <http://localhost:3000/api-docs>; raw spec at `/openapi.json`.

## Tests

E2E tests live in `tests/` (independent npm project, `type: module`). They are **black-box**: every request goes through the API gateway (`http://localhost:3000/api`) over HTTP; service code is never imported and the DB is never touched directly. Contracts come from `docs/openapi.yaml`.

- Stack: Node's built-in `node:test` + `node:assert/strict`, run through `tsx`. No Jest/Vitest.
- Run (stack already up): `cd tests && npm install && npm test`.
- One-shot (builds stack, waits for health, then tests): `cd tests && npm run test:stack`.
- Typecheck test code: `cd tests && npm run typecheck`.
- Override the API base URL with `TEST_BASE_URL`.
- Layout: `tests/e2e/*.test.ts` (suites), `tests/e2e/helpers/` (`api.ts` fetch wrapper + `waitForStack` + `expectStatus`; `factory.ts` `TestContext`; `unique.ts` unique names), `tests/scripts/` (stack check/up).
- Coverage: health, auth (register/login/profile/password), users (read, public recipes, saved, subscribers), recipes (CRUD, search/filters, drafts, ownership), steps, comments (+likes), ratings, saved recipes, subscriptions, feed, admin directory CRUD, and validation errors (400) / invalid tokens (401).
- **No leftover data**: each suite creates a `TestContext`, registers every entity in it, and calls `ctx.cleanup()` in `after()`. Cleanup deletes recipes (cascading steps/comments/likes/ratings/saves), then directory entries (dish types / ingredients, via admin token), then users via `DELETE /users/me`. Tests also assert deletes actually worked (recipe → 404, user login → 401).
- Use `uniqueName`/`uniqueTitle` for all created data so parallel suites and repeated runs never collide with existing DB rows.
- **Admin tests**: user-service bootstraps an admin on startup from `ADMIN_USERNAME` / `ADMIN_PASSWORD` (see `services/user/src/services/adminBootstrap.ts`). Tests log in with `loginAsAdmin()` (overrides: `TEST_ADMIN_USERNAME` / `TEST_ADMIN_PASSWORD`) — this is what makes `GET /users`, role changes and directory CRUD (`POST/PATCH/DELETE /dish-types`, `/ingredients`) testable and callable by agents/curl. The bootstrap admin is intentional seed data and is **not** deleted by cleanup.
- When adding coverage, add a `*.test.ts` file under `tests/e2e/` — it is picked up automatically by the `e2e/**/*.test.ts` glob. Keep to the HTTP-only + cleanup rules above.

## Critical gotchas

- Generated Prisma client lives in `src/generated/prisma` and is gitignored. After a fresh clone or any `schema.prisma` change run `npx prisma generate`, or imports from `../generated/prisma/client` fail. Dockerfiles run this at build time (with `.dockerignore` excluding `src/generated` so host output never leaks into the image).
- Migrations are applied automatically at container start: the `user`/`recipe` images run `npx prisma migrate deploy && npm start`. To apply manually use `docker compose exec user-service npx prisma migrate deploy`. `DATABASE_URL` uses docker hostnames (`user-db`, `recipe-db`), so Prisma commands must run inside a service container, not on the host.
- Prisma 7 driver adapter: clients are constructed with `PrismaPg` + a `pg` `Pool` in `src/config/database.ts`; the datasource URL is supplied in `prisma.config.ts`, not in `schema.prisma`.
- Every service entrypoint starts with `import 'dotenv/config'` (before `config` is imported) so local `npm start` works outside Docker.
- Do **not** add `express.json()` to `api-gateway`. It proxies raw bodies; the other services do parse JSON.
- Auth flow: only the gateway verifies JWTs and injects `x-user-id` / `x-user-role` headers. `user`/`recipe` trust those headers and contain no JWT code. `/api/internal/*` endpoints are unauthenticated service-to-service routes and are not proxied by the gateway.
- Roles: registration always creates `role: 'user'` and only an admin can change roles (`PATCH /users/:id/role`), so a chicken-and-egg exists. user-service breaks it at startup by idempotently creating/promoting an admin from `ADMIN_USERNAME`/`ADMIN_PASSWORD` (`services/user/src/services/adminBootstrap.ts`, best-effort, optional). Directory admin checks in `recipe` read `x-user-role`; `user` re-checks the DB via `AuthService.isUserAdmin`.
- `api-gateway` serves `docs/openapi.yaml` mounted read-only at `/app/openapi.yaml` (compose volume). Locally it also falls back to `../../docs/openapi.yaml`.

## Conventions

- API payloads are camelCase; DB columns are snake_case via Prisma `@map`. Zod schemas in `src/schemas` define/validate every request and response — parse through them instead of casting.
- **List endpoints return a pagination envelope**: `{ items, total, page, limit }` (`Paginated*Schema` in `src/schemas`). Non-paginated collections (steps) stay plain arrays.
- **Errors** are `{ error, details? }`. Services/middleware throw `AppError` subclasses from `src/errors.ts` (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`); the per-service `middleware/errorHandler.ts` maps `AppError` and Prisma codes (`P2002`→409, `P2003`→400, `P2025`→404) to statuses. Controllers are plain `async` and rely on Express 5 forwarding rejected promises — do not add `try/catch` that responds with a hardcoded 400.
- Request validation uses `express-zod-safe`; global options and the validation error shape live in `src/validation.ts` (imported for side effects at the top of route files and `app.ts`).
- Validate path/query inputs with the helpers in `src/errors.ts` (`parseId`, `parsePage`, `parseLimit`); enum query params (e.g. `difficulty`) via their Zod schema.
- `user` and `recipe` are ESM (`"type": "module"`): local imports must end in `.js`. `api-gateway` is CommonJS: imports must **not** have extensions.
- `tsconfig` says `module: commonjs` for all three, but code runs directly under `tsx`; the `dist/` output is unused.
- Each service mounts its router at `/api`; the gateway also serves `/api`. `GET /api/users/me/feed` is composed in the gateway (`services/api-gateway/src/routes/feed.ts`), not proxied; gateway route order matters because `/users/...` would otherwise swallow it (and `/users/:userId/recipes` must route to `recipe`, not `user`).

## Inter-service

- recipe → user over HTTP (`USER_SERVICE_URL`) via `/api/internal/users*` (`src/services/userServiceClient.ts`).
- user → recipe over RabbitMQ topic exchange `user-exchange` (`user.created`, `user.deleted`); recipe consumes `user.*` and cascades deletes. RabbitMQ connect is best-effort/non-blocking, so services start without it.

## Docs

- `docs/openapi.yaml` — OpenAPI 3.0 spec for public and `internal` endpoints.
- `docs/postman/RecipeHub.postman_collection.json` — main end-to-end scenario.
- Root and per-service `notes.md` hold Docker/Prisma usage in Russian.
- `deploy/` — Infrastructure as Code: nginx config, `setup-server.sh` / `deploy.sh`
  and `docker-compose.prod.yml` for VPS deployment. See `deploy/README.md`.
  Secrets: `services/*/.env` are gitignored; `.env.example` is the committed
  template and `setup-server.sh` copies it to `.env` on the server.
