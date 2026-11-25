# Учебный стенд RecipeHub в Yandex Cloud.
#
# Принципы:
#   * стенд одноразовый: apply → тесты/защита → destroy;
#   * одна зона доступности, один прерываемый узел, зональный мастер;
#   * PostgreSQL и RabbitMQ живут внутри кластера, без Managed-сервисов;
#   * никаких NAT-шлюзов, ALB, Lockbox, Managed Logging — только минимум
#     для ЛР7, всё остальное описано в техническом дизайне (ДЗ7).

locals {
  name_prefix = "recipehub"

  labels = {
    project     = "recipehub"
    environment = var.environment
    managed_by  = "terraform"
  }
}
