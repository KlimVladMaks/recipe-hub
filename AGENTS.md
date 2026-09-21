# AGENTS.md

Recipe-sharing microservices monorepo. No root package.json — each service is independent.

## Services

| Service | Dir | Port | Purpose |
|---|---|---|---|
| api-gateway | `services/api-gateway` | 3000 | JWT auth, routing, feed composition |
| user | `services/user` | 3001 | auth, users, subscriptions |
| recipe | `services/recipe` | 3002 | recipes, steps, comments, ratings |

Postgres per DB (`user-db` host port 5433, `recipe-db` 5434) and RabbitMQ (`rabbitmq`, 5672 / UI 15672). See `docker-compose.yml`.

## Commands

Run from repo root unless noted.

- Full stack: `docker compose up -d --build`
- One service: `docker compose up -d --build user-service`
- Logs: `docker compose logs -f <service>`
- Prisma Studio: `docker compose --profile prisma-studio up -d --build` (user 5555, recipe 5556)
- Manual run inside a service dir: `npm start` (executes `tsx src/server.ts`, no build step)
- Typecheck (only verification available; there are no test/lint scripts):
  `npx tsc --noEmit` in a service dir — requires `npx prisma generate` first.

## Critical gotchas

- Generated Prisma client lives in `src/generated/prisma` and is gitignored. After a fresh clone or any `schema.prisma` change run `npx prisma generate`, or imports from `../generated/prisma/client` fail. Dockerfiles run this at build time.
- Migrations are **not** applied by containers (Dockerfile only runs `generate`). Apply with `docker compose exec user-service npx prisma migrate deploy` (or `migrate dev`). `DATABASE_URL` uses docker hostnames (`user-db`, `recipe-db`), so Prisma commands must run inside a service container, not on the host.
- Prisma 7 driver adapter: clients are constructed with `PrismaPg` + a `pg` `Pool` in `src/config/database.ts`; the datasource URL is supplied in `prisma.config.ts`, not in `schema.prisma`.
- Do **not** add `express.json()` to `api-gateway`. It proxies raw bodies; the other services do parse JSON.
- Auth flow: only the gateway verifies JWTs and injects `x-user-id` / `x-user-role` headers. `user`/`recipe` trust those headers and contain no JWT code. `/api/internal/*` endpoints are unauthenticated service-to-service routes.

## Conventions

- API payloads are camelCase; DB columns are snake_case via Prisma `@map`. Zod schemas in `src/schemas` define/validate every request and response — parse through them instead of casting.
- `user` and `recipe` are ESM (`"type": "module"`): local imports must end in `.js`. `api-gateway` is CommonJS: imports must **not** have extensions.
- `tsconfig` says `module: commonjs` for all three, but code runs directly under `tsx`; the `dist/` output is unused.
- Each service mounts its router at `/api`; the gateway also serves `/api`. `GET /api/users/me/feed` is composed in the gateway (`services/api-gateway/src/routes/feed.ts`), not proxied; gateway route order matters because `/users/...` would otherwise swallow it.
- Errors are handled by a per-service `middleware/errorHandler.ts` returning `{ error }`.

## Inter-service

- recipe → user over HTTP (`USER_SERVICE_URL`) via `/api/internal/users*`.
- user → recipe over RabbitMQ topic exchange `user-exchange` (`user.created`, `user.deleted`); recipe consumes `user.*` and cascades deletes. RabbitMQ connect is best-effort/non-blocking, so services start without it.

## More notes

Per-service and root `notes.md` files hold Docker/Prisma usage in Russian.
