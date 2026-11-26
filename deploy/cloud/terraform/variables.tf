# --- Подключение к облаку -------------------------------------------------

variable "cloud_id" {
  description = "Yandex Cloud ID. Можно не задавать, если экспортирован YC_CLOUD_ID."
  type        = string
  default     = null
}

variable "folder_id" {
  description = "Каталог Yandex Cloud, в котором создаётся стенд."
  type        = string
}

# --- Расположение ---------------------------------------------------------

variable "zone" {
  description = "Зона доступности стенда (одна зона — осознанное решение ради экономии)."
  type        = string
  default     = "ru-central1-a"
}

variable "network_cidr" {
  description = "CIDR собственной сети стенда."
  type        = string
  default     = "10.10.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR подсети узлов и мастера."
  type        = string
  default     = "10.10.1.0/24"
}

variable "cluster_ipv4_range" {
  description = "CIDR подов кластера (не должен пересекаться с подсетью)."
  type        = string
  default     = "10.96.0.0/16"
}

variable "service_ipv4_range" {
  description = "CIDR сервисов кластера (не должен пересекаться с подсетью и подами)."
  type        = string
  default     = "10.112.0.0/16"
}

variable "admin_cidrs" {
  description = "Откуда разрешён доступ к Kubernetes API. Для учебного стенда по умолчанию весь интернет: API всё равно требует IAM-аутентификацию. Можно сузить до своего IP."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# --- Кластер --------------------------------------------------------------

variable "cluster_name" {
  description = "Имя кластера Managed Service for Kubernetes."
  type        = string
  default     = "recipehub-cloud"
}

variable "k8s_version" {
  description = "Версия Kubernetes для мастера и узлов."
  type        = string
  default     = "1.35"
}

variable "release_channel" {
  description = "Релизный канал кластера."
  type        = string
  default     = "STABLE"
}

variable "master_preset" {
  description = "Минимальная конфигурация мастера (s-c2-m8 — самая дешёвая доступная)."
  type        = string
  default     = "s-c2-m8"
}

# --- Группа узлов ---------------------------------------------------------

variable "node_platform_id" {
  description = "Платформа узлов."
  type        = string
  default     = "standard-v3"
}

variable "node_cores" {
  description = "vCPU на узел."
  type        = number
  default     = 2
}

variable "node_core_fraction" {
  description = "Гарантированная доля vCPU, %."
  type        = number
  default     = 50
}

variable "node_memory_gb" {
  description = "RAM узла, ГБ."
  type        = number
  default     = 4
}

variable "node_disk_type" {
  description = "Тип загрузочного диска узла."
  type        = string
  default     = "network-hdd"
}

variable "node_disk_size_gb" {
  description = "Размер загрузочного диска узла, ГБ (минимум 64)."
  type        = number
  default     = 64
}

variable "node_preemptible" {
  description = "Прерываемые узлы дешевле, но могут быть остановлены раз в 24 часа."
  type        = bool
  default     = true
}

variable "node_min" {
  description = "Минимум узлов в группе (автоскейлинг нужен для ЛР8)."
  type        = number
  default     = 1
}

variable "node_max" {
  description = "Максимум узлов в группе."
  type        = number
  default     = 2
}

variable "node_initial" {
  description = "Начальное число узлов."
  type        = number
  default     = 1
}

# --- Прочее ---------------------------------------------------------------

variable "environment" {
  description = "Метка окружения для облачных ресурсов."
  type        = string
  default     = "study"
}
