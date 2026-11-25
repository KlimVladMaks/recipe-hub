resource "yandex_kubernetes_cluster" "this" {
  name        = var.cluster_name
  description = "RecipeHub study stand (Managed Kubernetes)"
  network_id  = yandex_vpc_network.this.id
  labels      = local.labels

  master {
    version   = var.k8s_version
    public_ip = true

    zonal {
      zone      = var.zone
      subnet_id = yandex_vpc_subnet.this.id
    }

    security_group_ids = [
      yandex_vpc_security_group.k8s.id,
      yandex_vpc_security_group.master.id,
    ]

    # Автоматические обновления выключены: стенд живёт часами, внезапный
    # апгрейд мастера во время демонстрации нам не нужен.
    maintenance_policy {
      auto_upgrade = false
    }

    # s-c2-m8 — минимально доступная конфигурация мастера.
    scale_policy {
      auto_scale {
        min_resource_preset_id = var.master_preset
      }
    }
  }

  cluster_ipv4_range       = var.cluster_ipv4_range
  service_ipv4_range       = var.service_ipv4_range
  node_ipv4_cidr_mask_size = 24

  service_account_id      = yandex_iam_service_account.k8s_res.id
  node_service_account_id = yandex_iam_service_account.k8s_node.id

  release_channel         = var.release_channel
  network_policy_provider = "CALICO"

  # Права сервисных аккаунтов должны существовать до создания кластера,
  # иначе destroy может удалить их раньше кластера.
  depends_on = [
    yandex_resourcemanager_folder_iam_member.k8s_res_agent,
    yandex_resourcemanager_folder_iam_member.k8s_res_vpc,
    yandex_resourcemanager_folder_iam_member.k8s_res_lb,
    yandex_resourcemanager_folder_iam_member.k8s_node_puller,
  ]
}

resource "yandex_kubernetes_node_group" "this" {
  cluster_id  = yandex_kubernetes_cluster.this.id
  name        = "${var.cluster_name}-nodes"
  description = "RecipeHub study stand workers"
  version     = var.k8s_version
  labels      = local.labels

  instance_template {
    platform_id = var.node_platform_id

    network_interface {
      nat        = true
      subnet_ids = [yandex_vpc_subnet.this.id]
      security_group_ids = [
        yandex_vpc_security_group.k8s.id,
        yandex_vpc_security_group.nodes.id,
      ]
    }

    resources {
      cores         = var.node_cores
      core_fraction = var.node_core_fraction
      memory        = var.node_memory_gb
    }

    boot_disk {
      type = var.node_disk_type
      size = var.node_disk_size_gb
    }

    scheduling_policy {
      preemptible = var.node_preemptible
    }

    container_runtime {
      type = "containerd"
    }
  }

  # Тип масштабирования нельзя изменить после создания группы, поэтому
  # сразу включаем Cluster Autoscaler: он понадобится для ЛР8.
  scale_policy {
    auto_scale {
      min     = var.node_min
      max     = var.node_max
      initial = var.node_initial
    }
  }

  allocation_policy {
    location {
      zone = var.zone
    }
  }

  maintenance_policy {
    auto_upgrade = false
    auto_repair  = true
  }

  deploy_policy {
    max_expansion   = 0
    max_unavailable = 1
  }
}
