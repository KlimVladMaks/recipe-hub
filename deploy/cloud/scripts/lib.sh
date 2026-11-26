#!/usr/bin/env bash
# Общие функции для скриптов облачного стенда.
# Подключается через `source`, сам по себе не запускается.

set -euo pipefail

CLOUD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$CLOUD_DIR/../.." && pwd)"
TF_DIR="$CLOUD_DIR/terraform"
TF_BACKEND_FILE="$TF_DIR/backend.hcl"
K8S_DIR="$CLOUD_DIR/k8s"
RENDER_DIR="$CLOUD_DIR/.rendered"
SECRETS_FILE="$CLOUD_DIR/.secrets.env"
LAST_TAG_FILE="$CLOUD_DIR/.last-tag"
NAMESPACE="recipehub"

export PATH="$HOME/.local/bin:$PATH"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

require() { command -v "$1" >/dev/null 2>&1 || die "не найдено: $1 (см. deploy/cloud/README.md)"; }

require yc
require terraform
require kubectl

refresh_token() { export YC_TOKEN="$(yc iam create-token)"; }

tf() {
  refresh_token
  ( cd "$TF_DIR" && terraform "$@" )
}

tf_out() {
  ( cd "$TF_DIR" && terraform output -raw "$1" 2>/dev/null )
}

# Инициализация с remote state в Object Storage: конкретные значения бэкенда
# лежат в backend.hcl (в .gitignore, создаётся scripts/init-state.sh). Если
# файла нет — работаем как раньше, с локальным state.
terraform_init() {
  local args=(-input=false)
  if [ -f "$TF_BACKEND_FILE" ]; then
    args+=(-backend-config="$TF_BACKEND_FILE")
  fi
  tf init "${args[@]}" >/dev/null
}

registry_endpoint() { tf_out registry_endpoint; }

kubeconfig() {
  local id
  id="$(tf_out cluster_id)"
  [ -n "$id" ] || die "кластер не найден — сначала make up"
  yc managed-kubernetes cluster get-credentials --id "$id" --external --force >/dev/null 2>&1
  kubectl config current-context >/dev/null
}

# Секреты стенда живут только локально (файл в .gitignore) и переезжают
# в Kubernetes Secret. Для нового кластера они те же — это нормально:
# данные всё равно не сохраняются между сессиями.
load_secrets() {
  if [ -f "$SECRETS_FILE" ]; then
    # shellcheck disable=SC1090
    . "$SECRETS_FILE"
  else
    log "генерирую локальные секреты: $SECRETS_FILE"
    umask 077
    cat > "$SECRETS_FILE" <<SECRETS
JWT_SECRET=$(openssl rand -hex 32)
USER_DB_PASSWORD=$(openssl rand -hex 16)
RECIPE_DB_PASSWORD=$(openssl rand -hex 16)
RABBITMQ_PASSWORD=$(openssl rand -hex 16)
ADMIN_PASSWORD=$(openssl rand -hex 12)
SECRETS
    # shellcheck disable=SC1090
    . "$SECRETS_FILE"
  fi
}

apply_namespace_secrets() {
  kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

  kubectl -n "$NAMESPACE" create secret generic recipehub-secrets \
    --from-literal=JWT_SECRET="$JWT_SECRET" \
    --from-literal=USER_DB_PASSWORD="$USER_DB_PASSWORD" \
    --from-literal=RECIPE_DB_PASSWORD="$RECIPE_DB_PASSWORD" \
    --from-literal=RABBITMQ_PASSWORD="$RABBITMQ_PASSWORD" \
    --from-literal=ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null

  kubectl -n "$NAMESPACE" create configmap openapi-spec \
    --from-file=openapi.yaml="$REPO_ROOT/docs/openapi.yaml" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null
}

image_tag() {
  local sha
  sha="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
  if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
    sha="${sha}-dirty"
  fi
  printf '%s' "$sha"
}

current_tag() {
  if [ -n "${TAG:-}" ]; then
    printf '%s' "$TAG"
  elif [ -f "$LAST_TAG_FILE" ]; then
    cat "$LAST_TAG_FILE"
  else
    image_tag
  fi
}

render_manifests() {
  local registry tag
  registry="$(registry_endpoint)"
  tag="$(current_tag)"
  [ -n "$registry" ] || die "не удалось получить registry_endpoint из terraform"

  REGISTRY="$registry" TAG="$tag" "$CLOUD_DIR/scripts/render.sh"
  log "образы: $registry/recipehub-*:$tag"
}

wait_for_load_balancer() {
  local ip=""
  local i
  for i in $(seq 1 60); do
    ip="$(kubectl -n "$NAMESPACE" get svc api-gateway \
      -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
    if [ -n "$ip" ]; then
      printf '%s' "$ip"
      return 0
    fi
    sleep 5
  done
  return 1
}
