#!/usr/bin/env bash
# Проверить, что стенд действительно отвечает.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

kubeconfig >/dev/null

ip="$(kubectl -n "$NAMESPACE" get svc api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
[ -n "$ip" ] || die "у сервиса api-gateway нет внешнего IP"
base="http://$ip"

log "health-эндпоинты ($base)"
for path in api-gateway-health user-service-health recipe-service-health; do
  code="$(curl -s -o /tmp/recipehub-health.json -w '%{http_code}' --max-time 10 "$base/api/$path" || true)"
  if [ "$code" = "200" ]; then
    log "  $path -> 200"
  else
    warn "  $path -> $code"
    cat /tmp/recipehub-health.json 2>/dev/null || true
    exit 1
  fi
done

# swagger-ui-express отдаёт 301 на /api-docs без завершающего слэша,
# поэтому идём по редиректу.
code="$(curl -sL -o /dev/null -w '%{http_code}' --max-time 15 "$base/api-docs" || true)"
[ "$code" = "200" ] || die "Swagger UI недоступен: $code"
log "Swagger UI -> 200"

if [ "${RUN_E2E:-0}" = "1" ]; then
  # Bootstrap-админ создаётся user-service с паролем из секретов стенда,
  # поэтому тестам нужно передать его явно (по умолчанию тесты ждут admin123).
  load_secrets
  log "прогоняю E2E-тесты"
  ( cd "$REPO_ROOT/tests" \
    && TEST_BASE_URL="$base/api" \
       TEST_ADMIN_USERNAME=admin \
       TEST_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
       npm test )
fi

log "smoke пройден: $base/api"
