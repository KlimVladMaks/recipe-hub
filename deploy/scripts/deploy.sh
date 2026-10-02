#!/usr/bin/env bash
#
# deploy.sh — обновление уже развёрнутого RecipeHub до последней версии кода.
#
# Использование (под root):
#   bash /opt/recipe-hub/deploy/scripts/deploy.sh
#
# Этот же скрипт будет вызывать GitHub Actions на этапе ДЗ6 (автодеплой по push).
# Он неинтерактивен и рассчитан на запуск из CI по SSH.
#
# Параметры (переопределяются переменными окружения):
#   APP_DIR — каталог приложения (по умолчанию /opt/recipe-hub)
#   BRANCH  — ветка (по умолчанию main)

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/recipe-hub}"
BRANCH="${BRANCH:-main}"

log()  { printf '\n\033[1;34m=== %s ===\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m%s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m%s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m%s\033[0m\n' "$*" >&2; exit 1; }

COMPOSE_FILES=(-f docker-compose.yml -f deploy/docker-compose.prod.yml)

[ -d "$APP_DIR/.git" ] || die "Не найден репозиторий в $APP_DIR. Сначала выполни setup-server.sh."

cd "$APP_DIR"

log "Обновление кода ($BRANCH)"
git fetch --all --prune
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

# На случай перехода со старой схемы (до рефакторинга секретов):
# если .env отсутствует, но есть .env.example — восстановим.
for svc in user recipe api-gateway; do
    if [ ! -f "services/$svc/.env" ] && [ -f "services/$svc/.env.example" ]; then
        cp "services/$svc/.env.example" "services/$svc/.env"
        warn "Восстановлен services/$svc/.env из .env.example."
    fi
done

log "Пересборка и перезапуск стека"
docker compose "${COMPOSE_FILES[@]}" up -d --build

log "Очистка неиспользуемых образов"
docker image prune -f

log "Ожидание готовности API"
HEALTH_URL="http://127.0.0.1:3000/api/api-gateway-health"
for i in $(seq 1 60); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
        ok "Деплой успешен: $HEALTH_URL"
        exit 0
    fi
    sleep 3
done

warn "API не ответил за 3 минуты — деплой считается неуспешным."
warn "Логи: docker compose ${COMPOSE_FILES[*]} logs -f"
exit 1
