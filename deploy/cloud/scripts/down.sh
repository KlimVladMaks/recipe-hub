#!/usr/bin/env bash
# Удалить всё платное. Сначала Kubernetes-ресурсы (иначе останется NLB),
# затем terraform destroy.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

# State может лежать в Object Storage (backend.hcl) — тогда инициализация
# обязательна, иначе terraform не увидит созданные ресурсы.
log "terraform init"
terraform_init || warn "terraform init не удался — проверяю по локальному state"

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
    if [ -z "$(yc load-balancer network-load-balancer list --format json 2>/dev/null | tr -d '[]\n ' )" ]; then
      break
    fi
    sleep 5
  done

  # Реестр нельзя удалить, пока в нём есть образы, поэтому чистим их заранее.
  registry="$(tf_out registry_id 2>/dev/null || true)"
  if [ -n "$registry" ]; then
    log "удаляю образы из реестра $registry"
    for image in $(yc container image list --registry-id "$registry" --format json 2>/dev/null \
      | python3 -c 'import json,sys; print(" ".join(i["id"] for i in json.load(sys.stdin)))' 2>/dev/null); do
      yc container image delete --id "$image" >/dev/null 2>&1 || warn "не удалось удалить образ $image"
    done
  fi

  log "terraform destroy"
  # У API иногда бывают кратковременные Internal-ошибки при удалении
  # кластера; повторный запуск destroy продолжает с того же места.
  if ! tf destroy -auto-approve -input=false; then
    warn "destroy завершился с ошибкой, пробую ещё раз"
    tf destroy -auto-approve -input=false
  fi
fi

rm -f "$CLOUD_DIR/.url"

log "проверяю остатки"
leftovers=0
for check in \
  "yc managed-kubernetes cluster list" \
  "yc load-balancer network-load-balancer list" \
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
