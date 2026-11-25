# Собственная сеть: при `terraform destroy` удаляется целиком и не оставляет
# подсетей в default-сети, которая создаётся автоматически и неудаляема.

resource "yandex_vpc_network" "this" {
  name        = "${local.name_prefix}-net"
  description = "RecipeHub study stand network"
  labels      = local.labels
}

resource "yandex_vpc_subnet" "this" {
  name           = "${local.name_prefix}-subnet-${var.zone}"
  description    = "RecipeHub study stand subnet"
  zone           = var.zone
  network_id     = yandex_vpc_network.this.id
  v4_cidr_blocks = [var.subnet_cidr]
  labels         = local.labels
}

# --- Группы безопасности --------------------------------------------------
#
# 1. k8s — общий служебный трафик кластера и узлов (правила из документации
#    Managed Service for Kubernetes).
# 2. master — доступ к Kubernetes API и исходящие запросы мастера.
# 3. nodes — трафик подов/сервисов и NodePort для сетевого балансировщика.

resource "yandex_vpc_security_group" "k8s" {
  name        = "${local.name_prefix}-k8s"
  description = "Cluster <-> node service traffic"
  network_id  = yandex_vpc_network.this.id
  labels      = local.labels

  ingress {
    description       = "healthchecks of the network load balancer"
    protocol          = "TCP"
    predefined_target = "loadbalancer_healthchecks"
  }

  ingress {
    description       = "service traffic between master and nodes"
    protocol          = "ANY"
    predefined_target = "self_security_group"
  }

  ingress {
    description    = "ICMP health checks from cloud subnets"
    protocol       = "ICMP"
    v4_cidr_blocks = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
  }

  egress {
    description       = "service traffic between master and nodes"
    protocol          = "ANY"
    predefined_target = "self_security_group"
  }

  egress {
    description    = "master -> pods (webhooks, metrics-server)"
    protocol       = "ANY"
    v4_cidr_blocks = [var.cluster_ipv4_range]
  }
}

resource "yandex_vpc_security_group" "master" {
  name        = "${local.name_prefix}-master"
  description = "Kubernetes API access"
  network_id  = yandex_vpc_network.this.id
  labels      = local.labels

  ingress {
    description    = "kubernetes API (https)"
    protocol       = "TCP"
    port           = 443
    v4_cidr_blocks = var.admin_cidrs
  }

  ingress {
    description    = "kubernetes API (kube-apiserver)"
    protocol       = "TCP"
    port           = 6443
    v4_cidr_blocks = var.admin_cidrs
  }

  egress {
    description    = "master -> metrics-server pods"
    protocol       = "TCP"
    port           = 4443
    v4_cidr_blocks = [var.cluster_ipv4_range]
  }

  egress {
    description    = "NTP"
    protocol       = "UDP"
    port           = 123
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "yandex_vpc_security_group" "nodes" {
  name        = "${local.name_prefix}-nodes"
  description = "Pods, services and NodePort traffic"
  network_id  = yandex_vpc_network.this.id
  labels      = local.labels

  ingress {
    description    = "pods <-> services inside the cluster"
    protocol       = "ANY"
    v4_cidr_blocks = [var.cluster_ipv4_range, var.service_ipv4_range]
  }

  ingress {
    description    = "NodePort range for the network load balancer"
    protocol       = "TCP"
    from_port      = 30000
    to_port        = 32767
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description    = "pull images, reach registry and internet"
    protocol       = "ANY"
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
}
