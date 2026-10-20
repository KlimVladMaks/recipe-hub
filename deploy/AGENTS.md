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
| `ansible/` | all host configuration + deploy: playbooks `site.yml` / `deploy.yml`, roles, inventory, `group_vars` |
| `ansible/group_vars/all.yml` | single place for `app_dir`, `repo_url`, `branch`, compose flags, health URL, swap, nginx vars |
| `ansible/roles/nginx/templates/recipe-hub.conf.j2` | reverse proxy config (templated) + TLS stub at the end |
| `scripts/setup-server.sh` | bootstrap: install `ansible-core` + `community.general`, then run `site.yml` locally |
| `scripts/deploy.sh` | thin wrapper: run `deploy.yml` locally (what CI used to call over SSH) |

The two scripts are non-interactive, `set -euo pipefail`, honour `APP_DIR` / `BRANCH` / `REPO_URL`
(exported, then picked up by `group_vars`) and must keep working — `deploy/README.md` and the root
README advertise them.

## Ansible

Roles: `common` (packages, timezone, swap — tagged `swap`), `docker` (repo, packages,
`daemon.json` + restart handler), `firewall` (UFW; ports are allowed *before* `ufw enabled`,
otherwise SSH dies), `nginx` (template + `nginx -t` before reload), `app` (git, `.env`,
`docker compose up -d --build`, health poll). `site.yml` runs all of them; `deploy.yml` runs only
`app` and is what CI calls.

- Run playbooks **from `deploy/ansible`** — `ansible.cfg`, inventory and `group_vars` are resolved
  relative to the working directory.
- Inventory takes `SSH_HOST` / `SSH_USER` / `SSH_KEY` from the environment; never commit the IP.
- On the host itself use `-i localhost, -c local` (that is what the wrapper scripts do).
- `ansible.builtin.shell` runs under `/bin/sh` (dash) — pass `executable: /bin/bash` if the snippet
  uses `pipefail`.
- Keep `daemon.json.j2` output identical to what is already on the server; a diff restarts Docker
  and bounces every container.
- `.env` is copied with `force: false` — never make the role overwrite it.
- Verify: `ansible-playbook site.yml --syntax-check`, `ansible-lint` (passes at `production`
  profile), then a real run and a **second** run showing `changed=0` for everything except the
  compose task.
- A throwaway test: `docker run --privileged --cgroupns=host -v /sys/fs/cgroup:/sys/fs/cgroup:rw
  -v $PWD:/repo geerlingguy/docker-ubuntu2404-ansible` then run `site.yml --tags
  common,firewall,nginx,docker` inside (`swapon` does not work in a container — use
  `--skip-tags swap`).

## CI

`.github/workflows/deploy.yml`: `push` to `main` + `workflow_dispatch`, serialized by
`concurrency: deploy-production` (no cancel), checks out the repo, installs `ansible-core` in a
venv + `community.general`, runs `deploy.yml` over SSH (`SSH_HOST` / `SSH_USER` / `SSH_KEY` from
secrets), then a smoke test through nginx. **No test job** — if you add one, it should run before
the deploy step, not as a separate workflow, because the deploy mutates production anyway.

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
- nginx is managed by the `nginx` role: edit
  `ansible/roles/nginx/templates/recipe-hub.conf.j2` (not files on the server, they get overwritten)
  and apply with `ansible-playbook site.yml --tags nginx`.
- Verification after any infra change: on the server `curl http://127.0.0.1:3000/api/api-gateway-health`,
  from outside `curl http://<host>/api/api-gateway-health`, optionally the E2E suite:
  `cd tests && TEST_BASE_URL=http://<host>/api npm test`.

## Adding monitoring

Dashboards/provisioning go next to the compose override or in their own `deploy/monitoring/`;
anything that must be installed on the host belongs in a new role under `deploy/ansible/roles/`
(and gets added to `site.yml`). Keep it idempotent, secrets out of git, nothing published publicly,
and verify by re-running the playbook twice. Record the resulting commands in `deploy/README.md`
and update this file so the next session doesn't have to rediscover them.
