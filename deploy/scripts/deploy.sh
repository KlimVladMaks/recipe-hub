#!/usr/bin/env bash
#
# deploy.sh — обновление уже развёрнутого RecipeHub до последней версии кода.
#
# Скрипт — тонкая обёртка над Ansible: запускает deploy/ansible/deploy.yml
# (git pull -> пересборка образов -> health-check) с локальным подключением.
# Логика описана в роли app (deploy/ansible/roles/app).
#
# Использование (под root):
#   bash /opt/recipe-hub/deploy/scripts/deploy.sh
#
# Параметры (переопределяются переменными окружения):
#   APP_DIR — каталог приложения (по умолчанию /opt/recipe-hub)
#   BRANCH  — ветка (по умолчанию main)

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/recipe-hub}"
BRANCH="${BRANCH:-main}"

log()  { printf '\n\033[1;34m=== %s ===\033[0m\n' "$*"; }
die()  { printf '\033[1;31m%s\033[0m\n' "$*" >&2; exit 1; }

[ -d "$APP_DIR/.git" ] || die "Не найден репозиторий в $APP_DIR. Сначала выполни setup-server.sh."

PLAYBOOK_DIR="$APP_DIR/deploy/ansible"
[ -f "$PLAYBOOK_DIR/deploy.yml" ] || die "Не найден $PLAYBOOK_DIR/deploy.yml."

# ansible-core из setup-server.sh может жить в venv — добавляем его в PATH.
if ! command -v ansible-playbook >/dev/null 2>&1 && [ -x /opt/ansible-venv/bin/ansible-playbook ]; then
    export PATH="/opt/ansible-venv/bin:$PATH"
fi
command -v ansible-playbook >/dev/null 2>&1 \
    || die "Не найден ansible-playbook. Выполни setup-server.sh."

export APP_DIR BRANCH

log "Обновление кода и пересборка стека ($BRANCH)"
cd "$PLAYBOOK_DIR"
ansible-playbook -i localhost, -c local deploy.yml
