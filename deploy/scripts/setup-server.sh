#!/usr/bin/env bash
#
# setup-server.sh — настройка чистого VPS (Ubuntu 22.04/24.04) и развёртывание
# RecipeHub. Скрипт только готовит Ansible и запускает playbook: вся настройка
# сервера описана декларативно в deploy/ansible/site.yml и его ролях.
# Повторный запуск безопасен — playbook идемпотентен.
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
#   1) ставит ansible-core >= 2.16 (из apt, при необходимости — в venv);
#   2) ставит коллекцию community.general (ansible-galaxy);
#   3) запускает deploy/ansible/site.yml с локальным подключением.
#
# Раньше скрипт сам ставил Docker/nginx/UFW/swap — теперь это роли playbook-а:
#   common   — пакеты, часовой пояс, swap
#   docker   — Docker Engine, compose-plugin, ротация логов
#   firewall — UFW (22/80/443)
#   nginx    — обратный прокси
#   app      — код, services/*/.env, стек, health-check

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/KlimVladMaks/recipe-hub.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/recipe-hub}"
ANSIBLE_VENV="/opt/ansible-venv"

# Минимальная версия ansible-core: требуется коллекцией community.general 9+.
ANSIBLE_MIN_CORE="2.16"

export DEBIAN_FRONTEND=noninteractive

log()  { printf '\n\033[1;34m=== %s ===\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m%s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m%s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m%s\033[0m\n' "$*" >&2; exit 1; }

# Возвращает версию ansible-core или пустую строку.
ansible_core_version() {
    command -v ansible-playbook >/dev/null 2>&1 || return 0
    ansible-playbook --version 2>/dev/null | sed -n '1s/.*core \([0-9.]*\).*/\1/p'
}

# version_ge <версия> <минимум>
version_ge() {
    [ -n "$1" ] || return 1
    [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -1)" = "$2" ]
}

apt_install() {
    apt-get install -y --no-install-recommends "$@"
}

# --------------------------------------------------------------------------
# 0. Проверки и определение каталога репозитория
# --------------------------------------------------------------------------
[ "$(id -u)" -eq 0 ] || die "Скрипт нужно запускать под root (например: sudo bash $0)"

# Если скрипт запущен изнутри уже склонированного репозитория — используем его.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
if [ -n "${SCRIPT_DIR:-}" ] && [ -d "$SCRIPT_DIR/../../.git" ]; then
    APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
    warn "Обнаружен локальный репозиторий, использую APP_DIR=$APP_DIR"
elif [ ! -d "$APP_DIR/.git" ]; then
    # Сценарий `curl ... | bash`: playbook ещё негде взять — клонируем репозиторий.
    log "Клонирование репозитория в $APP_DIR"
    apt-get update -y
    apt_install ca-certificates git
    mkdir -p "$(dirname "$APP_DIR")"
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

PLAYBOOK_DIR="$APP_DIR/deploy/ansible"
[ -f "$PLAYBOOK_DIR/site.yml" ] || die "Не найден $PLAYBOOK_DIR/site.yml — проверь репозиторий."

export APP_DIR REPO_URL BRANCH

# --------------------------------------------------------------------------
# 1. Ansible
# --------------------------------------------------------------------------
log "[1/3] ansible-core >= $ANSIBLE_MIN_CORE"
if version_ge "$(ansible_core_version)" "$ANSIBLE_MIN_CORE"; then
    ok "ansible-core $(ansible_core_version) уже установлен."
else
    apt-get update -y
    apt_install python3 python3-apt ca-certificates curl
    apt-get install -y --no-install-recommends ansible-core 2>/dev/null || true
    if ! version_ge "$(ansible_core_version)" "$ANSIBLE_MIN_CORE"; then
        warn "ansible-core из apt отсутствует или старее $ANSIBLE_MIN_CORE — ставлю в venv."
        apt_install python3-venv
        [ -d "$ANSIBLE_VENV" ] || python3 -m venv "$ANSIBLE_VENV"
        "$ANSIBLE_VENV/bin/pip" install --quiet --upgrade pip
        "$ANSIBLE_VENV/bin/pip" install --quiet "ansible-core>=$ANSIBLE_MIN_CORE,<2.19"
        export PATH="$ANSIBLE_VENV/bin:$PATH"
    fi
    version_ge "$(ansible_core_version)" "$ANSIBLE_MIN_CORE" \
        || die "Не удалось поставить ansible-core >= $ANSIBLE_MIN_CORE."
    ok "ansible-core $(ansible_core_version) установлен."
fi

# --------------------------------------------------------------------------
# 2. Коллекции
# --------------------------------------------------------------------------
log "[2/3] Коллекции Ansible (community.general)"
ansible-galaxy collection install \
    -r "$PLAYBOOK_DIR/requirements.yml" >/dev/null
ok "Коллекции установлены."

# --------------------------------------------------------------------------
# 3. Playbook
# --------------------------------------------------------------------------
log "[3/3] site.yml: настройка VPS и развёртывание"
cd "$PLAYBOOK_DIR"
ansible-playbook -i localhost, -c local site.yml

printf '\n'
ok "=== Готово! RecipeHub развёрнут ==="
echo "  Локально на сервере : http://127.0.0.1:3000/api"
echo "  Извне (nginx)       : http://<IP_СЕРВЕРА>/api/api-gateway-health"
echo "  Swagger UI          : http://<IP_СЕРВЕРА>/api-docs"
echo "  Логи                : cd $APP_DIR && docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml logs -f"
echo "  Обновление          : bash $APP_DIR/deploy/scripts/deploy.sh"
