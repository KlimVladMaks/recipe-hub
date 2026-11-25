output "cluster_id" {
  description = "ID кластера Managed Service for Kubernetes."
  value       = yandex_kubernetes_cluster.this.id
}

output "cluster_name" {
  description = "Имя кластера."
  value       = yandex_kubernetes_cluster.this.name
}

output "cluster_external_endpoint" {
  description = "Публичный endpoint Kubernetes API."
  value       = yandex_kubernetes_cluster.this.master[0].external_v4_endpoint
}

output "node_group_id" {
  description = "ID группы узлов."
  value       = yandex_kubernetes_node_group.this.id
}

output "registry_id" {
  description = "ID Container Registry (для тегов образов)."
  value       = yandex_container_registry.this.id
}

output "registry_endpoint" {
  description = "Префикс образов в реестре."
  value       = "cr.yandex/${yandex_container_registry.this.id}"
}

output "network_id" {
  description = "ID сети стенда."
  value       = yandex_vpc_network.this.id
}

output "subnet_id" {
  description = "ID подсети стенда."
  value       = yandex_vpc_subnet.this.id
}

output "zone" {
  description = "Зона доступности стенда."
  value       = var.zone
}
