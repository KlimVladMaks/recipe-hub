# Развёртывание

## Локальный стенд

```bash
docker compose up -d --build
```

Поднимаются три сервиса, две базы PostgreSQL, RabbitMQ и Prisma Studio.
Подробности — в разделе [Быстрый старт](getting-started.md).

## Облачный стенд (Yandex Cloud)

Для раздела 4 дисциплины приложение разворачивается в Yandex Managed Service for
Kubernetes. Стенд одноразовый: он нужен на время проверки и защиты, а потом
удаляется, чтобы не платить за простой.

### Что создаётся

- VPC с подсетями и группами безопасности;
- зональный кластер Kubernetes с preemptible-узлами и Cluster Autoscaler;
- Container Registry для образов сервисов и инфраструктурных образов;
- балансировщик (Network Load Balancer) для `api-gateway`;
- PostgreSQL и RabbitMQ внутри кластера на сетевых SSD.

Всё описано в Terraform (`deploy/cloud/terraform/`) и Kubernetes-манифестах
(`deploy/cloud/k8s/`). Архитектурные решения, отказоустойчивость, безопасность и
стоимость — в [техническом дизайне](cloud/technical-design.md).

### Ручной запуск

```bash
cd deploy/cloud
make up        # Terraform: кластер, реестр, сеть
make build     # собрать и запушить образы
make deploy    # применить манифесты и дождаться rollout
make smoke     # проверить API снаружи
make down      # удалить всё платное
```

`make down` удаляет кластер, балансировщик, диски и образы; после него не
остаётся платных ресурсов.

### CI/CD

Три workflow в `.github/workflows/`:

| Workflow | Запуск | Что делает |
|---|---|---|
| `ci.yml` | push/PR | типы, OpenAPI-линт, E2E и Postman на docker compose |
| `deploy-cloud.yml` | вручную | сборка и пуш образов, `kubectl apply`, smoke, E2E против облака |
| `infra.yml` | вручную | `terraform plan`, затем `apply` или `destroy` сохранённого плана |

Деплой и инфраструктура требуют подтверждения в GitHub Environment
`cloud-stand`, поэтому push в ветку не может создать платный кластер. Команды:

```bash
gh workflow run infra.yml -f action=apply
gh workflow run deploy-cloud.yml -f action=deploy
gh workflow run infra.yml -f action=destroy -f confirm=destroy
```

Состояние Terraform хранится в Yandex Object Storage (remote state), чтобы
локальный запуск и CI работали с одним и тем же стендом. Секреты GitHub и
подробный разбор пайплайна — в
[deploy/cloud/README.md](https://github.com/KlimVladMaks/recipe-hub/blob/main/deploy/cloud/README.md).

## VPS (архив)

В разделе 3 приложение разворачивалось на виртуальной машине: nginx как обратный
прокси, Ansible для настройки, Prometheus/Grafana/Loki для мониторинга. После
защиты ЛР4–ЛР6 сервер удалён; конфигурация осталась в `deploy/` как история
решений. Старый workflow автодеплоя на VPS отключён и не должен включаться без
реального сервера и свежих секретов.
