#!/usr/bin/env bash
#
# setup-server.sh — первичная настройка чистого VPS (Ubuntu 22.04/24.04) и
# развёртывание RecipeHub. Скрипт идемпотентен: повторный запуск безопасен.
#
# Запускать под root:
#   bash deploy/scripts/setup-server.sh
#
# Параметры (можно переопределить переменными окружения):
#   REPO_URL  — git-адрес репозитория (по умолчанию публичный RecipeHub)
#   BRANCH    — ветка для развёртывания (по умолчанию main)
#   APP_DIR   — каталог приложения (по умолчанию /opt/recipe-hub)
#
# Что делает скрипт:
#   1) ставит базовые утилиты и обновляет систему;
#   2) создаёт swap-файл (страховка от OOM на 2 ГБ RAM при сборке образов);
#   3) устанавливает Docker Engine + compose-plugin;
#   4) настраивает UFW (SSH/80/443);
#   5) клонирует репозиторий (если его ещё нет) и генерирует .env из .env.example;
#   6) устанавливает и настраивает nginx как обратный прокси;
#   7) собирает и поднимает стек с прод-оверрайдом;
#   8) дожидается health-эндпоинта шлюза.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/KlimVladMaks/recipe-hub.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/recipe-hub}"

export DEBIAN_FRONTEND=noninteractive

log()  { printf '\n\033[1;34m=== %s ===\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m%s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m%s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m%s\033[0m\n' "$*" >&2; exit 1; }

COMPOSE_FILES=(-f docker-compose.yml -f deploy/docker-compose.prod.yml)

# --------------------------------------------------------------------------
# 0. Проверки и определение каталога репозитория
# --------------------------------------------------------------------------
[ "$(id -u)" -eq 0 ] || die "Скрипт нужно запускать под root (например: sudo bash $0)"

# Если скрипт запущен изнутри уже склонированного репозитория — используем его.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
if [ -n "${SCRIPT_DIR:-}" ] && [ -d "$SCRIPT_DIR/../.." ] && [ -d "$SCRIPT_DIR/../../.git" ]; then
    APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
    warn "Обнаружен локальный репозиторий, использую APP_DIR=$APP_DIR"
fi

# --------------------------------------------------------------------------
# 1. Базовые утилиты
# --------------------------------------------------------------------------
log "[1/8] Обновление системы и базовые утилиты"
apt-get update -y
apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg git lsb-release ufw nginx
ok "Базовые пакеты установлены."

# --------------------------------------------------------------------------
# 2. Swap
# --------------------------------------------------------------------------
log "[2/8] Swap"
if swapon --show | grep -q '/swapfile'; then
    ok "Swap уже активен, пропускаем."
elif [ -f /swapfile ]; then
    swapon /swapfile || true
    ok "Существующий /swapfile подключён."
else
    if ! fallocate -l 2G /swapfile 2>/dev/null; then
        dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    fi
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ok "Создан swap 2 ГБ."
fi

# --------------------------------------------------------------------------
# 3. Docker
# --------------------------------------------------------------------------
log "[3/8] Docker Engine и compose-plugin"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    ok "Docker и compose-plugin уже установлены."
else
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y --no-install-recommends \
        docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    ok "Docker установлен."
fi
systemctl enable --now docker

# Ротация docker-логов на уровне демона — защита 40 ГБ диска.
log "Настройка /etc/docker/daemon.json (ротация логов)"
mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ] || ! grep -q 'max-size' /etc/docker/daemon.json; then
    cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
JSON
    systemctl restart docker
    ok "Ротация логов включена."
else
    ok "daemon.json уже настроен."
fi

# --------------------------------------------------------------------------
# 4. Файрвол
# --------------------------------------------------------------------------
log "[4/8] Файрвол UFW"
ufw allow OpenSSH    >/dev/null
ufw allow 80/tcp     >/dev/null
ufw allow 443/tcp    >/dev/null
ufw --force enable   >/dev/null
ok "UFW активен: разрешены SSH, 80, 443."

# --------------------------------------------------------------------------
# 5. Репозиторий и .env
# --------------------------------------------------------------------------
log "[5/8] Репозиторий и окружение"
if [ -d "$APP_DIR/.git" ]; then
    ok "Репозиторий уже есть: $APP_DIR (обновляю код)"
    git -C "$APP_DIR" fetch --all --prune
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
    mkdir -p "$(dirname "$APP_DIR")"
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
    ok "Репозиторий склонирован: $APP_DIR"
fi

# Секретов в git нет — генерируем .env из .env.example (MVP-значения).
# Уже существующий .env не перезаписываем, чтобы прод-правки сохранялись.
for svc in user recipe api-gateway; do
    if [ -f "$APP_DIR/services/$svc/.env" ]; then
        ok "services/$svc/.env уже существует — оставляю как есть."
    elif [ -f "$APP_DIR/services/$svc/.env.example" ]; then
        cp "$APP_DIR/services/$svc/.env.example" "$APP_DIR/services/$svc/.env"
        ok "Создан services/$svc/.env из .env.example."
    else
        warn "Не найден services/$svc/.env.example — пропускаю."
    fi
done

# --------------------------------------------------------------------------
# 6. nginx
# --------------------------------------------------------------------------
log "[6/8] Nginx (обратный прокси)"
cp "$APP_DIR/deploy/nginx/recipe-hub.conf" /etc/nginx/sites-available/recipe-hub
ln -sf /etc/nginx/sites-available/recipe-hub /etc/nginx/sites-enabled/recipe-hub
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx
ok "Nginx настроен и перезагружен."

# --------------------------------------------------------------------------
# 7. Сборка и запуск стека
# --------------------------------------------------------------------------
log "[7/8] Сборка и запуск docker-стека"
cd "$APP_DIR"
docker compose "${COMPOSE_FILES[@]}" up -d --build
ok "Стек запущен."

# --------------------------------------------------------------------------
# 8. Ожидание готовности
# --------------------------------------------------------------------------
log "[8/8] Ожидание готовности API"
HEALTH_URL="http://127.0.0.1:3000/api/api-gateway-health"
for i in $(seq 1 60); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
        ok "API готов: $HEALTH_URL"
        break
    fi
    if [ "$i" -eq 60 ]; then
        warn "API не ответил за 3 минуты. Проверь логи:"
        warn "  cd $APP_DIR && docker compose ${COMPOSE_FILES[*]} logs -f"
        exit 1
    fi
    sleep 3
done

IP="$(hostname -I | awk '{print $1}')"
printf '\n'
ok "=== Готово! RecipeHub развёрнут ==="
echo "  Локально на сервере : http://127.0.0.1:3000/api"
echo "  Извне (nginx)       : http://${IP}/api/api-gateway-health"
echo "  Swagger UI          : http://${IP}/api-docs"
echo "  Логи                : cd $APP_DIR && docker compose ${COMPOSE_FILES[*]} logs -f"
