#!/usr/bin/env bash
# Собрать три образа и запушить их в Container Registry.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

require docker

registry="$(registry_endpoint)"
[ -n "$registry" ] || die "реестр не найден — сначала make up"
tag="$(image_tag)"
printf '%s' "$tag" > "$LAST_TAG_FILE"

log "docker login cr.yandex (IAM-токен)"
yc iam create-token | docker login --username iam --password-stdin cr.yandex >/dev/null

for pair in "api-gateway:recipehub-api-gateway" "user:recipehub-user" "recipe:recipehub-recipe"; do
  dir="${pair%%:*}"
  name="${pair##*:}"
  log "собираю $name из services/$dir"
  docker build -t "$registry/$name:$tag" "$REPO_ROOT/services/$dir"
  log "пушу $registry/$name:$tag"
  docker push "$registry/$name:$tag" >/dev/null
done

log "копирую инфраструктурные образы (postgres, rabbitmq, busybox)"
REGISTRY="$registry" TAG="$tag" "$CLOUD_DIR/scripts/mirror-images.sh"

log "образы готовы, тег: $tag"
