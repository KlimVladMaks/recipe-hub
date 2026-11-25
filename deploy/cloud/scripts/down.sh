#!/usr/bin/env bash
# Удалить всё платное. Сначала Kubernetes-ресурсы (иначе останется NLB),
# затем terraform destroy.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

if [ -z "$(tf_out cluster_id 2>/dev/null || true)" ]; then
  warn "в terraform state нет кластера — удалять нечего"
else
  kubeconfig >/dev/null 2>&1 || warn "не удалось получить kubeconfig"

  if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    log "удаляю namespace $NAMESPACE (вместе с ним — Service, NLB и PVC)"
    kubectl delete namespace "$NAMESPACE" --wait=true --timeout=420s || warn "namespace удалился не полностью"
  fi

  log "жду, пока облако удалит сетевой балансировщик (до 5 мин)"
  for i in $(seq 1 60); do
    if [ -z "$(yc network-load-balancer list --format json 2>/dev/null | tr -d '[]\n ' )" ]; then
      break
    fi
    sleep 5
  done

  log "terraform destroy"
  tf destroy -auto-approve -input=false
fi

rm -f "$CLOUD_DIR/.url"

log "проверяю остатки"
leftovers=0
for check in \
  "yc managed-kubernetes cluster list" \
  "yc network-load-balancer list" \
  "yc vpc address list" \
  "yc compute disk list"; do
  out="$($check 2>/dev/null || true)"
  if printf '%s' "$out" | grep -qE '^\| [a-z0-9]{15,}'; then
    warn "осталось: $check"
    printf '%s\n' "$out"
    leftovers=1
  fi
done

if [ "$leftovers" = "0" ]; then
  log "платных ресурсов не осталось"
else
  warn "проверьте остатки вручную: https://console.yandex.cloud"
fi
