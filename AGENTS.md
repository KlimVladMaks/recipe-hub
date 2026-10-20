# AGENTS.md

Recipe-sharing + culinary-blogs service (ITMO «Бэкенд-разработка»). Microservices
monorepo; no root `package.json` — each service and `tests/` are independent npm projects.

**Current phase:** the app itself (auth, recipes, steps, comments, ratings, saved recipes,
subscriptions, feed) is feature-complete and runs in production on a VPS. New work is
about operations/infrastructure — CI/CD, Ansible, monitoring — not new product features.
Product scope and architecture diagram: `README.md`.

## Services

| Service | Dir | Port | Module | Purpose |
|---|---|---|---|---|
| api-gateway | `services/api-gateway` | 3000 | CommonJS | JWT auth, routing, feed composition, Swagger UI |
| user | `services/user` | 3001 | ESM | auth, users, subscriptions |
| recipe | `services/recipe` | 3002 | ESM | recipes, steps, comments, ratings, saved recipes |

Postgres per DB (`user-db` 5433, `recipe-db` 5434) + RabbitMQ (5672, UI 15672) — see
`docker-compose.yml`. Infra lives in `deploy/`, E2E tests in `tests/`, API spec in
`docs/openapi.yaml`, CI in `.github/workflows/deploy.yml`.

## Commands

Run from repo root unless noted.

- Local stack: `docker compose up -d --build`; one service: `docker compose up -d --build user-service`.
- Logs: `docker compose logs -f <service>`.
- Typecheck a service (needs `npx prisma generate` first): `cd services/<service> && npm run typecheck`.
- E2E tests: `cd tests && npm test` (stack up) or `npm run test:stack` (builds + runs). See `tests/AGENTS.md`.
- Prisma: `npm run prisma:generate`, `npm run prisma:migrate` (`migrate deploy`). `DATABASE_URL` uses
  docker hostnames, so run these inside a container, not on the host.
- Swagger UI: <http://localhost:3000/api-docs>; raw spec at `/openapi.json`.

## Production & auto-deploy — read before pushing

- **Any push/merge to `main` deploys to the live VPS**: `.github/workflows/deploy.yml` → SSH →
  `deploy/scripts/deploy.sh` (`git pull --ff-only` → rebuild → health check). Don't push or merge
  to `main` unless the user explicitly asks; work on a branch.
- CI runs **no tests** — run `cd tests && npm test` locally before proposing a push.
- Prod stack is `docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml` (ports
  bound to `127.0.0.1`, only nginx is public). Never `down -v` there — it deletes volumes.
- The VPS is small (2 vCPU / 2 GB + swap), a rebuild takes minutes, deploys are serialized
  (`concurrency: deploy-production`).
- Secrets: `services/*/.env` are gitignored and generated from `.env.example` **only at first
  setup** — editing `.env.example` does not update the server. `JWT_SECRET` must be identical in
  all three services. GitHub secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`; app dir on the
  server is `/opt/recipe-hub` (root).
- Don't SSH into the VPS or edit files there unless explicitly asked.
- Details and rules for infra changes: `deploy/AGENTS.md` + `deploy/README.md`.

## Code rules (only if you touch `services/`)

- Payloads camelCase, DB columns snake_case via Prisma `@map`. Zod schemas in `src/schemas`
  validate every request/response — parse through them instead of casting.
- List endpoints return `{ items, total, page, limit }` (`Paginated*Schema`); steps stay plain arrays.
- Errors are `{ error, details? }`: throw `AppError` subclasses from `src/errors.ts`; Prisma codes
  (`P2002`→409, `P2003`→400, `P2025`→404) are mapped in `middleware/errorHandler.ts`. Controllers are
  plain `async` (Express 5 forwards rejections) — no `try/catch` with a hardcoded 400.
- Validation via `express-zod-safe` (`src/validation.ts`); `parseId`/`parsePage`/`parseLimit` for
  path/query ints, enum query params via their Zod schema.
- `user`/`recipe` are ESM: relative imports need `.js`. `api-gateway` is CommonJS: **no** extensions.
  Everything runs under `tsx`; `dist/` is unused, `tsconfig module` is misleading.
- Do **not** add `express.json()` to the gateway (it proxies raw bodies). Only the gateway verifies
  JWTs and injects `x-user-id`/`x-user-role`; `user`/`recipe` trust those headers.
- Prisma 7 driver adapter (`PrismaPg` + `pg` Pool in `src/config/database.ts`); generated client in
  `src/generated/prisma` is gitignored → `npx prisma generate` after a clone or schema change.
  Migrations run automatically at container start.
- Gateway route order matters: `/users/me/feed` is composed there and `/users/:userId/recipes` must
  route to `recipe`, not `user`.
- Each entrypoint starts with `import 'dotenv/config'` (before `config`) for local `npm start`.

## Inter-service

- recipe → user: HTTP `/api/internal/users*` (`USER_SERVICE_URL`); internal routes are not proxied
  by the gateway and are blocked at nginx.
- user → recipe: RabbitMQ topic exchange `user-exchange` (`user.created`, `user.deleted`); recipe
  cascades deletes. Connect is best-effort, services start without RabbitMQ.
- Admin bootstrap: user-service creates/promotes `ADMIN_USERNAME`/`ADMIN_PASSWORD` at startup
  (`services/user/src/services/adminBootstrap.ts`), so a chicken-and-egg exists for roles.
