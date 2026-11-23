variable "cloud_id" {
  description = "Yandex Cloud ID. Можно не задавать, если экспортирован YC_CLOUD_ID."
  type        = string
  default     = null
}

variable "folder_id" {
  description = "Yandex Cloud folder ID. Можно не задавать, если экспортирован YC_FOLDER_ID."
  type        = string
  default     = null
}

variable "zone" {
  description = "Зона доступности для учебного стенда."
  type        = string
  default     = "ru-central1-a"
}

variable "cluster_name" {
  description = "Имя кластера Managed Service for Kubernetes."
  type        = string
  default     = "recipehub-cloud"
}

variable "environment" {
  description = "Метка окружения для облачных ресурсов."
  type        = string
  default     = "study"
}
