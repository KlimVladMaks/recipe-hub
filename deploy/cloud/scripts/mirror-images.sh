#!/usr/bin/env bash
# Зеркалирование инфраструктурных образов в Container Registry.
#
# Узлы кластера в российском регионе не могут надёжно тянуть образы из
# Docker Hub (registry-1.docker.io отдаёт i/o timeout), поэтому postgres,
# rabbitmq и busybox копируются в собственный реестр, откуда pull работает.
#
# Используется и локальным `make build`, и GitHub Actions. Требует, чтобы
# `docker login cr.yandex` уже был выполнен.
#
#   REGISTRY=cr.yandex/<id> TAG=<tag> ./mirror-images.sh

set -euo pipefail

REGISTRY="${REGISTRY:?переменная REGISTRY не задана}"
TAG="${TAG:?переменная TAG не задана}"

# источник в Docker Hub : имя образа в нашем реестре
IMAGES=(
  "postgres:18.3-alpine:recipehub-postgres"
  "rabbitmq:4.1-management-alpine:recipehub-rabbitmq"
  "busybox:1.37:recipehub-busybox"
)

for entry in "${IMAGES[@]}"; do
  name="${entry##*:}"                    # recipehub-postgres
  source_image="${entry%:$name}"         # postgres:18.3-alpine
  target="$REGISTRY/$name:$TAG"

  echo "==> $source_image -> $target"
  docker pull "$source_image"
  docker tag "$source_image" "$target"
  docker push "$target"
done

echo "инфраструктурные образы скопированы в реестр (тег $TAG)"
