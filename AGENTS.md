# AGENTS.md

Recipe-sharing + culinary-blogs service (ITMO «Бэкенд-разработка»). Microservices
monorepo; no root `package.json` — each service and `tests/` are independent npm projects.

**Current phase:** the app itself (auth, recipes, steps, comments, ratings, saved recipes,
subscriptions, feed) is feature-complete. Section 3 (VPS deploy, Ansible, monitoring) is done;
**the VPS has been deleted** after the defence. Section 4 is now the active work: a disposable
Managed Kubernetes stand in Yandex Cloud (`deploy/cloud/`), plus cloud CI/CD and docs.
Product scope and architecture diagram: `README.md`. The section-4 technical design (ДЗ7) is
`docs/cloud/technical-design.md` — when you change infrastructure, update it too (it has a
"соответствие реализации" table that maps every design claim to a file).

Documentation (ДЗ9) is a MkDocs site built from `docs/` and published to GitHub Pages:
<https://klimvladmaks.github.io/recipe-hub/> (`mkdocs.yml`, `requirements-docs.txt`,
`.github/workflows/docs.yml`). The API is documented by `docs/openapi.yaml` (Swagger UI at
`/api-docs`, linted with Redocly in CI) and by the Postman collection in `tests/postman/`
(environments `local`/`cloud`). When you add or change an endpoint, update the spec and the
collection; `mkdocs build --strict` must stay green.

## Services

| Service | Dir | Port | Module | Purpose |
|---|---|---|---|---|
| api-gateway | `services/api-gateway` | 3000 | CommonJS | JWT auth, routing, feed composition, Swagger UI |
| user | `services/user` | 3001 | ESM | auth, users, subscriptions |
| recipe | `services/recipe` | 3002 | ESM | recipes, steps, comments, ratings, saved recipes |

Postgres per DB (`user-db` 5433, `recipe-db` 5434) + RabbitMQ (5672, UI 15672) — see
`docker-compose.yml`. Infra lives in `deploy/` (VPS/Ansible) and `deploy/cloud/` (Yandex Cloud),
E2E tests in `tests/`, API spec in `docs/openapi.yaml`.

## Commands

Run from repo root unless noted.

- Local stack: `docker compose up -d --build`; one service: `docker compose up -d --build user-service`.
- Logs: `docker compose logs -f <service>`.
- Typecheck a service (needs `npx prisma generate` first): `cd services/<service> && npm run typecheck`.
- E2E tests: `cd tests && npm test` (stack up) or `npm run test:stack` (builds + runs). See `tests/AGENTS.md`.
- Prisma: `npm run prisma:generate`, `npm run prisma:migrate` (`migrate deploy`). `DATABASE_URL` uses
  docker hostnames, so run these inside a container, not on the host.
- Swagger UI: <http://localhost:3000/api-docs>; raw spec at `/openapi.json`.
- OpenAPI lint: `npx @redocly/cli@2.84.0 lint docs/openapi.yaml` (config in `redocly.yaml`).
- Docs site: `python3 -m venv .venv-docs && .venv-docs/bin/pip install -r requirements-docs.txt`,
  then `.venv-docs/bin/mkdocs serve` (<http://127.0.0.1:8000/recipe-hub/>) or
  `.venv-docs/bin/mkdocs build --strict`. The site lives in `docs/`, nav in `mkdocs.yml`.
- Ansible (server config + deploy): `cd deploy/ansible` first, then `ansible-playbook site.yml`
  (full host setup), `ansible-playbook deploy.yml` (update + rebuild), `--check --diff` to preview,
  `--tags nginx|docker|firewall|common|app`, `--skip-tags swap`. Needs `SSH_HOST`/`SSH_USER` env
  when run from a laptop; on the host itself add `-i localhost, -c local`.

## Cloud stand & auto-deploy — read before pushing

- **There is no live VPS any more.** `.github/workflows/deploy.yml` was renamed to
  `.github/workflows/deploy-vps.yml.disabled` on `feature/cloud`: it pointed at a deleted server
  and must not be re-enabled without a real host and fresh secrets.
- **The cloud stand is disposable and costs money per hour.** Everything lives in `deploy/cloud/`:
  `make up` → `make build` → `make deploy` → `make down`. Never leave it running unattended and
  never run `terraform apply` on a push — infra changes are manual and confirmed.
- Don't push or merge to `main` unless the user explicitly asks; work on a branch.
- CI (`.github/workflows/ci.yml`) runs typecheck, `redocly lint docs/openapi.yaml` and the full
  E2E/Newman suite on docker compose for every push and PR — it uses no cloud and costs nothing.
  `.github/workflows/docs.yml` builds MkDocs with `--strict` on PRs and publishes to GitHub Pages
  from `main`. Cloud delivery is manual only: `deploy-cloud.yml` (app) and `infra.yml` (Terraform),
  both gated by the `cloud-stand` Environment.
- Prod stack is `docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml` (ports
  bound to `127.0.0.1`, only nginx is public). Never `down -v` there — it deletes volumes.
- The VPS is small (2 vCPU / 2 GB + swap), a rebuild takes minutes, deploys are serialized
  (`concurrency: deploy-production`).
- Secrets: `services/*/.env` are gitignored and generated from `.env.example` **only at first
  setup** — editing `.env.example` does not update the server. `JWT_SECRET` must be identical in
  all three services. GitHub side (cloud stand): `YC_SA_KEY_JSON`, `YC_CLOUD_ID`, `YC_FOLDER_ID`,
  `TF_STATE_ACCESS_KEY`, `TF_STATE_SECRET_KEY`, `APP_*` app secrets, variable `TF_STATE_BUCKET`;
  the old `SSH_*` VPS secrets are gone. App dir on the (deleted) VPS was `/opt/recipe-hub`.
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
