#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

id="$(tf_out cluster_id)"
[ -n "$id" ] || die "кластер не найден"
log "запускаю кластер $id"
yc managed-kubernetes cluster start --id "$id"
log "жду готовности узлов"
kubeconfig
kubectl wait --for=condition=Ready nodes --all --timeout=600s
kubectl get nodes
