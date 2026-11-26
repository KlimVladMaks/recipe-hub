#!/usr/bin/env bash
# Одноразовая подготовка того, что нужно CI, но не создаётся Terraform'ом:
#   1. сервисный аккаунт `recipehub-ci` (от его имени работают GitHub Actions);
#   2. бакет Object Storage для remote state;
#   3. ключи: авторизованный (для yc/terraform) и статический (для S3-бэкенда).
#
# Скрипт идемпотентен: существующие аккаунт, бакет и права переиспользуются.
# Результат — `deploy/cloud/terraform/backend.hcl` и файлы в `.ci/` (в .gitignore).
#
# Дальше остаётся положить значения в GitHub (см. вывод в конце).

set -euo pipefail

CLOUD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CI_DIR="$CLOUD_DIR/.ci"
TF_DIR="$CLOUD_DIR/terraform"
SA_NAME="recipehub-ci"

require() { command -v "$1" >/dev/null 2>&1 || { echo "не найдено: $1" >&2; exit 1; }; }
require yc
require jq

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }

folder_id="${YC_FOLDER_ID:-$(yc config get folder-id)}"
[ -n "$folder_id" ] || { echo "не задан folder-id (yc config set folder-id ...)" >&2; exit 1; }

mkdir -p "$CI_DIR"
chmod 700 "$CI_DIR"

# --- 1. Сервисный аккаунт --------------------------------------------------
sa_id="$(yc iam service-account list --format json | jq -r --arg n "$SA_NAME" '.[] | select(.name == $n) | .id')"
if [ -z "$sa_id" ]; then
  log "создаю сервисный аккаунт $SA_NAME"
  sa_id="$(yc iam service-account create --name "$SA_NAME" \
    --description "GitHub Actions CI/CD for recipe-hub" --format json | jq -r '.id')"
else
  log "сервисный аккаунт $SA_NAME уже существует: $sa_id"
fi
printf 'SA_ID=%s\n' "$sa_id" > "$CI_DIR/sa.id"

for role in admin k8s.cluster-api.cluster-admin storage.admin container-registry.images.pusher; do
  log "роль $role на каталог $folder_id"
  yc resource-manager folder add-access-binding "$folder_id" \
    --role "$role" --service-account-id "$sa_id" >/dev/null
done

# --- 2. Ключи --------------------------------------------------------------
if [ ! -f "$CI_DIR/sa-key.json" ]; then
  log "создаю авторизованный ключ (для yc и terraform)"
  yc iam key create --service-account-id "$sa_id" --output "$CI_DIR/sa-key.json" >/dev/null
fi

if [ ! -f "$CI_DIR/access-key.json" ]; then
  log "создаю статический ключ (для S3-бэкенда)"
  yc iam access-key create --service-account-id "$sa_id" --format json > "$CI_DIR/access-key.json"
fi

# --- 3. Бакет для state ----------------------------------------------------
bucket="${TF_STATE_BUCKET:-recipehub-tfstate-$folder_id}"
if ! yc storage bucket get "$bucket" >/dev/null 2>&1; then
  log "создаю бакет $bucket"
  yc storage bucket create --name "$bucket" --default-storage-class standard \
    --max-size 1073741824 --tags project=recipehub,environment=study >/dev/null
  yc storage bucket update --name "$bucket" --versioning versioning-enabled >/dev/null
else
  log "бакет $bucket уже существует"
fi
printf 'BUCKET=%s\n' "$bucket" > "$CI_DIR/bucket.env"

# --- 4. backend.hcl для terraform -----------------------------------------
key_id="$(jq -r '.access_key.key_id' "$CI_DIR/access-key.json")"
secret="$(jq -r '.secret' "$CI_DIR/access-key.json")"
cat > "$TF_DIR/backend.hcl" <<EOF
bucket = "$bucket"
key    = "recipehub/terraform.tfstate"
region = "ru-central1"

endpoints = {
  s3 = "https://storage.yandexcloud.net"
}

access_key = "$key_id"
secret_key = "$secret"

skip_region_validation      = true
skip_credentials_validation = true
skip_requesting_account_id  = true
skip_s3_checksum            = true
EOF
chmod 600 "$TF_DIR/backend.hcl"

log "готово. Дальше — секреты в GitHub:"
cat <<EOF

  gh secret set YC_SA_KEY_JSON        < $CI_DIR/sa-key.json
  gh secret set TF_STATE_ACCESS_KEY   --body "$key_id"
  gh secret set TF_STATE_SECRET_KEY   --body "$secret"
  gh secret set YC_CLOUD_ID           --body "$(yc config get cloud-id)"
  gh secret set YC_FOLDER_ID          --body "$folder_id"
  gh variable set TF_STATE_BUCKET     --body "$bucket"

Пароли приложения (JWT_SECRET, *_DB_PASSWORD, RABBITMQ_PASSWORD,
ADMIN_PASSWORD) берутся из deploy/cloud/.secrets.env — они должны совпадать
с локальными, иначе E2E-тесты не пройдут против облака.

Проверить state: cd deploy/cloud/terraform && terraform init -backend-config=backend.hcl
EOF
