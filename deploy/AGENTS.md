# deploy/ — infrastructure & operations (agent notes)

Everything that is not application code: the prod compose override, nginx, setup/deploy scripts
and, later, Ansible and monitoring. **Put new infrastructure here, not in the repo root.**
The full runbook (in Russian) is `deploy/README.md`; this file is the agent-facing summary and
adds the rules that matter when changing infra.

## Topology

```text
internet → nginx (80/443, the only public port) → 127.0.0.1:3000 api-gateway
        → docker network → user / recipe services, user-db, recipe-db, RabbitMQ
```

`/api/internal/*` is answered with 403 by nginx. Host ports for the DBs, RabbitMQ, Prisma Studio
and the gateway are bound to `127.0.0.1` — reach them with an SSH tunnel
(`ssh -L 15672:127.0.0.1:15672 root@<host>`).

## Files

| Path | Role |
|---|---|
| `docker-compose.prod.yml` | prod override: `!override` 127.0.0.1 ports, log rotation, `restart: unless-stopped` |
| `nginx/recipe-hub.conf` | reverse proxy + TLS stub at the end of the file |
| `scripts/setup-server.sh` | idempotent first install: base packages, swap, Docker, UFW, `.env` from `.env.example`, nginx, stack up, health wait |
| `scripts/deploy.sh` | update: `git pull --ff-only` → rebuild → `docker image prune` → health poll (3 min) |

Both scripts are non-interactive, `set -euo pipefail`, configurable via `APP_DIR` / `BRANCH` /
`REPO_URL`, and are called from CI over SSH — keep that contract and keep them idempotent.

## CI

`.github/workflows/deploy.yml`: `push` to `main` + `workflow_dispatch`, serialized by
`concurrency: deploy-production` (no cancel), SSH key from secrets (`SSH_HOST`, `SSH_USER`,
`SSH_PRIVATE_KEY`), then a smoke test through nginx. **No test job** — if you add one, it should run
before the deploy step, not as a separate workflow, because the deploy mutates production anyway.

## Rules

- Keep `ports: !override` in `docker-compose.prod.yml`. Without the tag Compose *merges* lists with
  the base file and publishes on `0.0.0.0`.
- **Nothing new may listen publicly.** Grafana/Prometheus/exporters/etc. go to `127.0.0.1` and are
  reached through nginx or an SSH tunnel; keep `/api/internal/*` blocked.
- The VPS has 2 vCPU / 2 GB RAM + 2 GB swap. Count memory before adding containers and prefer
  memory limits — a full image rebuild already saturates it.
- Prod commands, from `/opt/recipe-hub`:
  `COMPOSE="-f docker-compose.yml -f deploy/docker-compose.prod.yml"`, then
  `docker compose $COMPOSE ps|logs -f|up -d --build`. `down -v` deletes data.
- `.env` on the server is created from `.env.example` only when missing and lives outside git.
  `.env.example` is the single template: document every new variable there. `JWT_SECRET` must match
  across all three services.
- nginx is installed by `setup-server.sh`; editing `nginx/recipe-hub.conf` requires re-copying it to
  the server and `nginx -t && systemctl reload nginx`.
- Verification after any infra change: on the server `curl http://127.0.0.1:3000/api/api-gateway-health`,
  from outside `curl http://<host>/api/api-gateway-health`, optionally the E2E suite:
  `cd tests && TEST_BASE_URL=http://<host>/api npm test`.

## Adding Ansible / monitoring

The approach isn't chosen yet — when it is, keep playbooks/roles under `deploy/` (e.g.
`deploy/ansible/`) and dashboards/provisioning next to the compose override or in their own
`deploy/monitoring/`. Keep them idempotent, secrets out of git, nothing published publicly, and
verify by re-running the playbook twice. Record the resulting commands in `deploy/README.md` and
update this file so the next session doesn't have to rediscover them.
