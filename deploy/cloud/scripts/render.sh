#!/usr/bin/env bash
# Рендер Kubernetes-манифестов: подставляет реестр и тег образов.
#
# Используется и локально (`make deploy`), и в GitHub Actions, поэтому не
# зависит от terraform/yc/kubectl — только от переменных окружения:
#
#   REGISTRY=cr.yandex/<id> TAG=<git-sha> ./render.sh
#
# Результат складывается в deploy/cloud/.rendered (каталог в .gitignore).

set -euo pipefail

CLOUD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
K8S_DIR="$CLOUD_DIR/k8s"
RENDER_DIR="$CLOUD_DIR/.rendered"

REGISTRY="${REGISTRY:?переменная REGISTRY не задана (например, cr.yandex/<id>)}"
TAG="${TAG:?переменная TAG не задана (например, git short sha)}"

rm -rf "$RENDER_DIR"
mkdir -p "$RENDER_DIR"

count=0
for manifest in "$K8S_DIR"/*.yaml; do
  sed -e "s|__REGISTRY__|$REGISTRY|g" \
      -e "s|__TAG__|$TAG|g" \
      "$manifest" > "$RENDER_DIR/$(basename "$manifest")"
  count=$((count + 1))
done

printf 'отрендерено %d манифестов: %s/*:%s → %s\n' \
  "$count" "$REGISTRY" "$TAG" "$RENDER_DIR"
