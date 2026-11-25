#!/usr/bin/env bash
# Показать состояние стенда и напомнить про платные ресурсы.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

log "terraform outputs"
( cd "$TF_DIR" && terraform output 2>/dev/null || warn "terraform state пуст — стенд не создан" )

if [ -n "$(tf_out cluster_id 2>/dev/null || true)" ]; then
  log "кластер"
  yc managed-kubernetes cluster list 2>/dev/null || true
  log "узлы"
  kubeconfig >/dev/null 2>&1 || true
  kubectl get nodes -o wide 2>/dev/null || true
  log "поды"
  kubectl -n "$NAMESPACE" get pods -o wide 2>/dev/null || true
  log "сервисы"
  kubectl -n "$NAMESPACE" get svc 2>/dev/null || true
fi

log "платные ресурсы вне Terraform (проверяем, что ничего не забыто)"
echo '--- сетевые балансировщики ---'
yc load-balancer network-load-balancer list 2>/dev/null || true
echo '--- публичные IP ---'
yc vpc address list 2>/dev/null || true
echo '--- диски ---'
yc compute disk list 2>/dev/null || true
