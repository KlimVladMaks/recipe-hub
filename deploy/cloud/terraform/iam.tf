# Сервисные аккаунты:
#   * k8s-res  — от его имени Managed Service for Kubernetes создаёт узлы,
#                диски, внутренние балансировщики и NLB для Service type=LoadBalancer;
#   * k8s-node — от его имени узлы тянут образы из Container Registry.

resource "yandex_iam_service_account" "k8s_res" {
  name        = "${local.name_prefix}-k8s-res"
  description = "Managed Kubernetes resource service account"
  labels      = local.labels
}

resource "yandex_iam_service_account" "k8s_node" {
  name        = "${local.name_prefix}-k8s-node"
  description = "Managed Kubernetes node service account"
  labels      = local.labels
}

resource "yandex_resourcemanager_folder_iam_member" "k8s_res_agent" {
  folder_id = var.folder_id
  role      = "k8s.clusters.agent"
  member    = "serviceAccount:${yandex_iam_service_account.k8s_res.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "k8s_res_vpc" {
  folder_id = var.folder_id
  role      = "vpc.publicAdmin"
  member    = "serviceAccount:${yandex_iam_service_account.k8s_res.id}"
}

# Нужна, чтобы контроллер облака создал сетевой балансировщик для
# Service type=LoadBalancer (публичный вход в приложение).
resource "yandex_resourcemanager_folder_iam_member" "k8s_res_lb" {
  folder_id = var.folder_id
  role      = "load-balancer.admin"
  member    = "serviceAccount:${yandex_iam_service_account.k8s_res.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "k8s_node_puller" {
  folder_id = var.folder_id
  role      = "container-registry.images.puller"
  member    = "serviceAccount:${yandex_iam_service_account.k8s_node.id}"
}
