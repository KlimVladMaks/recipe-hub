#!/usr/bin/env bash
# Остановить кластер на короткий перерыв: мастер и узлы не тарифицируются,
# диски, IP и балансировщик — продолжают.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

id="$(tf_out cluster_id)"
[ -n "$id" ] || die "кластер не найден"
log "останавливаю кластер $id"
yc managed-kubernetes cluster stop --id "$id"
log "остановлен. Возобновить: make resume"
