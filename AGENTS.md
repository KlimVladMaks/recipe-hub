# AGENTS.md

Recipe-sharing microservices monorepo. No root package.json — each service is independent.
Human-facing overview: `README.md`. API contract: `docs/openapi.yaml`.

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
- Typecheck (only verification available; there are no test/lint scripts): `npm run typecheck`
  (= `npx tsc --noEmit`) in a service dir — requires `npx prisma generate` first.
- Prisma: `npm run prisma:generate`, `npm run prisma:migrate` (`migrate deploy`).
- Swagger UI: <http://localhost:3000/api-docs>; raw spec at `/openapi.json`.

## Critical gotchas

- Generated Prisma client lives in `src/generated/prisma` and is gitignored. After a fresh clone or any `schema.prisma` change run `npx prisma generate`, or imports from `../generated/prisma/client` fail. Dockerfiles run this at build time (with `.dockerignore` excluding `src/generated` so host output never leaks into the image).
- Migrations are applied automatically at container start: the `user`/`recipe` images run `npx prisma migrate deploy && npm start`. To apply manually use `docker compose exec user-service npx prisma migrate deploy`. `DATABASE_URL` uses docker hostnames (`user-db`, `recipe-db`), so Prisma commands must run inside a service container, not on the host.
- Prisma 7 driver adapter: clients are constructed with `PrismaPg` + a `pg` `Pool` in `src/config/database.ts`; the datasource URL is supplied in `prisma.config.ts`, not in `schema.prisma`.
- Every service entrypoint starts with `import 'dotenv/config'` (before `config` is imported) so local `npm start` works outside Docker.
- Do **not** add `express.json()` to `api-gateway`. It proxies raw bodies; the other services do parse JSON.
- Auth flow: only the gateway verifies JWTs and injects `x-user-id` / `x-user-role` headers. `user`/`recipe` trust those headers and contain no JWT code. `/api/internal/*` endpoints are unauthenticated service-to-service routes and are not proxied by the gateway.
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
