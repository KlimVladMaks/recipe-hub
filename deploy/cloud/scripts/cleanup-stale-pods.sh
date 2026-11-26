#!/usr/bin/env bash
# Удалить поды, которые остались на прежних образах.
#
# Зачем: при обновлении манифестов Deployment сам заменит поды, но
# StatefulSet ждёт, пока текущий под станет Ready, — а под, застрявший в
# ImagePullBackOff со старым образом, Ready не станет никогда. В итоге
# `kubectl rollout status` висит до таймаута. Удаление такого пода заставляет
# контроллер создать его заново уже с актуальным тегом.
#
# Используется в `deploy.sh` и в GitHub Actions.

set -euo pipefail

NAMESPACE="${NAMESPACE:-recipehub}"
TAG="${TAG:?переменная TAG не задана}"

command -v jq >/dev/null 2>&1 || { echo "не найдено: jq" >&2; exit 1; }

pods="$(kubectl -n "$NAMESPACE" get pods -o json 2>/dev/null \
  | jq -r --arg tag ":$TAG" '
      .items[]
      | select(
          (([.spec.containers[].image] + [.spec.initContainers[]?.image])
            | map(select(. != null))
            | any(endswith($tag) | not))
        )
      | .metadata.name' || true)"

if [ -z "$pods" ]; then
  echo "все поды используют тег $TAG"
  exit 0
fi

for pod in $pods; do
  echo "удаляю под $pod: образ не соответствует тегу $TAG"
  kubectl -n "$NAMESPACE" delete pod "$pod" --wait=false
done
