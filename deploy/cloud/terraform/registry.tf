# Один реестр на все три сервиса. Хранение образов стоит копейки,
# а сам реестр живёт между сессиями — это позволяет не пересобирать
# образы при каждом `make up`.
resource "yandex_container_registry" "this" {
  name      = "${local.name_prefix}-registry"
  folder_id = var.folder_id
  labels    = local.labels
}
