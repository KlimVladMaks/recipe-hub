#!/usr/bin/env bash
# Создать стенд: сеть, IAM, Managed Kubernetes, группу узлов, реестр.
# Занимает 10–20 минут и с этого момента начинает стоить денег.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

log "terraform init"
tf init -input=false >/dev/null

log "terraform apply (создаём инфраструктуру, ~10–20 мин)"
tf apply -auto-approve -input=false

log "получаю kubeconfig"
kubeconfig

log "жду готовности узлов (до 10 мин)"
if ! kubectl wait --for=condition=Ready nodes --all --timeout=600s; then
  warn "узлы не стали Ready за 10 минут"
  kubectl get nodes -o wide || true
  exit 1
fi

kubectl get nodes -o wide
log "стенд создан. Дальше: make build && make deploy"
