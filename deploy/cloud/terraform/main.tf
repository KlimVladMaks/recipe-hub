# Каркас облачной инфраструктуры RecipeHub.
#
# На этом этапе здесь намеренно нет ресурсов: сначала фиксируем провайдер,
# переменные и правила работы, чтобы первый `terraform apply` был осознанным
# и не создал ничего лишнего. Ресурсы (VPC, IAM, Managed K8s, Container
# Registry, node group) добавляются следующим коммитом.
#
# Правила:
#   * всё создаётся в одном каталоге Yandex Cloud;
#   * стенд одноразовый: `terraform apply` → тесты/защита → `terraform destroy`;
#   * никаких Managed PostgreSQL, NAT-шлюзов, ALB и постоянных узлов —
#     только обязательный минимум для ЛР7.
locals {
  name_prefix = "recipehub"
  labels = {
    project     = "recipehub"
    environment = var.environment
    managed_by  = "terraform"
  }
}
