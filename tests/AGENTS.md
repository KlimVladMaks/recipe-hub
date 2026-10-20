# tests/ — E2E (agent notes)

Full details: `tests/README.md`. This file is the short version for agents.

- **Black-box only**: every request goes through the API gateway (`http://localhost:3000/api`)
  over HTTP. Never import service code, never touch the DB directly. Contracts come from
  `docs/openapi.yaml`.
- `node:test` + `node:assert/strict` via `tsx`. No Jest/Vitest.
- Run: `npm test` (stack must be up) or `npm run test:stack`. `TEST_BASE_URL` overrides the base URL.
- **Run the suite before proposing a push to `main`** — CI has no test job and every push to
  `main` redeploys production.
- New suite = any `e2e/*.test.ts` file (auto-globbed), in the same style as the existing ones.
- Rules that keep runs clean: create a `TestContext`, register every created entity in it, call
  `ctx.cleanup()` in `after()`; use `uniqueName`/`uniqueTitle` (suites run in parallel);
  assert with `expectStatus(response, code)`.
- The bootstrap admin (`ADMIN_USERNAME`/`ADMIN_PASSWORD`, defaults `admin`/`admin123`) is
  intentional seed data and is not removed by cleanup. `TEST_ADMIN_USERNAME`/`TEST_ADMIN_PASSWORD`
  override it.
