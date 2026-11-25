#!/usr/bin/env bash
# Применить манифесты и дождаться rollout.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

load_secrets
kubeconfig

log "создаю namespace, Secret и ConfigMap со спецификацией OpenAPI"
apply_namespace_secrets

log "рендерю манифесты"
render_manifests

log "применяю манифесты"
kubectl apply -f "$RENDER_DIR"

log "жду rollout (до 5 мин на каждый компонент)"
kubectl -n "$NAMESPACE" rollout status statefulset/user-db --timeout=300s
kubectl -n "$NAMESPACE" rollout status statefulset/recipe-db --timeout=300s
kubectl -n "$NAMESPACE" rollout status deployment/rabbitmq --timeout=300s
kubectl -n "$NAMESPACE" rollout status deployment/user-service --timeout=300s
kubectl -n "$NAMESPACE" rollout status deployment/recipe-service --timeout=300s
kubectl -n "$NAMESPACE" rollout status deployment/api-gateway --timeout=300s

log "жду публичный IP балансировщика"
if ip="$(wait_for_load_balancer)"; then
  log "приложение доступно: http://$ip/api"
  log "Swagger UI:         http://$ip/api-docs"
  printf 'http://%s' "$ip" > "$CLOUD_DIR/.url"
else
  warn "балансировщик ещё не выдал IP — проверьте: kubectl -n $NAMESPACE get svc api-gateway"
fi

kubectl -n "$NAMESPACE" get pods -o wide
