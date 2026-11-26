# Облачный стенд RecipeHub (Yandex Cloud)

Учебный, **одноразовый** стенд для ДЗ7 / ЛР7 / ДЗ8 / ДЗ9. Основная идея:
пока стенд нужен — он работает; после тестов и защиты — удаляется, и мы за
него не платим.

> Статус: инфраструктура, манифесты, скрипты и CI/CD готовы; стенд проверен на
> живом кластере (52 E2E-теста) и погашен. Технический дизайн —
> [`docs/cloud/technical-design.md`](../../docs/cloud/technical-design.md).
> Дальше: ДЗ9 (документация).

## Архитектура

```text
Интернет
   │  HTTP :80
   ▼
Yandex NLB (публичный IP)
   │  NodePort 30000–32767
   ▼
Service type=LoadBalancer → api-gateway :3000
   ├── user-service :3001 ── user-db (PostgreSQL, PVC)
   └── recipe-service :3002 ─ recipe-db (PostgreSQL, PVC)
                         └── RabbitMQ
```

- **Managed Service for Kubernetes**: зональный мастер `s-c2-m8`,
  одна группа узлов (1 × preemptible 2 vCPU / 4 ГБ, `standard-v3`,
  boot disk 64 ГБ HDD, публичный IP).
- **PostgreSQL и RabbitMQ** — внутри кластера, без Managed-сервисов:
  для учебного стенда это заметно дешевле, а данные между сессиями
  всё равно не сохраняются.
- **Container Registry** — образы собираются в GitHub Actions
  (`deploy-cloud.yml`); локально остаётся `make build` для отладки.
- **NLB** — создаётся автоматически из `Service type=LoadBalancer`
  для `api-gateway`; отдельного ingress-контроллера на стенде нет.
- **Секреты** — K8s Secrets из GitHub Secrets или локального
  `.secrets.env` (в git не попадает).

Production-вариант (для текста ДЗ7) отличается: три зоны, региональный
мастер, несколько узлов, Managed PostgreSQL, ALB + TLS, Lockbox, Monium
и регулярные бэкапы. В стенде эти вещи сознательно не поднимаются, чтобы
не платить за избыточную для учебной задачи инфраструктуру. Подробное
сравнение — раздел 11 в [`technical-design.md`](../../docs/cloud/technical-design.md).

## Стоимость (ориентир, ru-central1)

| Ресурс | Конфигурация | ₽/час |
|---|---:|---:|
| Мастер Managed K8s | зональный, 2 vCPU / 8 ГБ | 7,20 |
| Worker | 1 × preemptible, 2 vCPU (50%), 4 ГБ | 0,82 |
| Boot disk | 64 ГБ HDD | 0,31 |
| Публичный IP worker | динамический | 0,26 |
| NLB | публичный, TCP 80 | 0,92 |
| Публичный IP NLB | динамический | 0,26 |
| PVC | 2 × 5 ГБ SSD | 0,20 |
| Container Registry + state | ~1–2 ГБ | ~0,01 |
| **Итого** | | **~10 ₽/час** |

Ориентиры: 1 час теста — ~10 ₽, 4 часа — ~40 ₽, 8 часов — ~80 ₽.
Остановленный кластер (`pause`) — ~2 ₽/час, полностью удалённый (`down`) —
почти 0 ₽. Оставить кластер на месяц — ~7 200 ₽, поэтому `down` обязателен.

## Жизненный цикл

Все команды — из каталога `deploy/cloud`:

```bash
make up       # создать инфраструктуру и дождаться узлов, ~10–20 мин
make build    # собрать три образа и запушить в Container Registry
make deploy   # применить манифесты, дождаться rollout, вывести URL
make smoke    # health всех сервисов + Swagger UI
make test     # smoke + E2E-тесты (tests/, чёрный ящик)
make url      # текущий адрес стенда
make status   # что создано и не осталось ли платных «сирот»
make pause    # остановить кластер (мастер и узлы не тарифицируются)
make resume   # вернуть кластер после pause
make down     # удалить namespace, NLB, PVC и весь Terraform-стенд
```

`make up` требует авторизованного `yc` (достаточно один раз выполнить `yc init`).
Terraform получает IAM-токен через `yc iam create-token` автоматически.

## CI/CD (ДЗ8)

Три workflow в `.github/workflows/`:

| Workflow | Запуск | Что делает | Стоит денег |
|---|---|---|---|
| `ci.yml` | push в любую ветку, PR | typecheck всех проектов, `docker compose`, 52 E2E, Newman | нет |
| `deploy-cloud.yml` | `workflow_dispatch` | сборка/пуш образов, `kubectl apply`, smoke, E2E в облаке | да (стенд уже поднят) |
| `infra.yml` | `workflow_dispatch` | `plan` / `apply` / `destroy` Terraform | да (apply/destroy) |

`deploy-cloud.yml` и `infra.yml` выполняются в GitHub Environment `cloud-stand`
с обязательным подтверждением: запуск висит в статусе «Waiting» и ждёт
approval, поэтому случайно создать кластер из push невозможно.

```bash
# инфраструктура
gh workflow run infra.yml -f action=plan                    # бесплатно, план в summary
gh workflow run infra.yml -f action=apply                   # после approval
gh workflow run infra.yml -f action=destroy -f confirm=destroy

# приложение (кластер уже создан)
gh workflow run deploy-cloud.yml -f action=deploy            # полный цикл
gh workflow run deploy-cloud.yml -f action=smoke             # только проверка
gh workflow run deploy-cloud.yml -f action=destroy-namespace # убрать NLB и PVC

gh run list --limit 5
gh run watch <run-id>
```

### Remote state

Terraform-состояние живёт в Yandex Object Storage, а не на раннере: раннер
одноразовый, и без этого `destroy` из следующего запуска не увидел бы ресурсы.
Одноразовая подготовка (сервисный аккаунт `recipehub-ci`, бакет, ключи,
`backend.hcl`):

```bash
./scripts/init-state.sh
```

Скрипт печатает команды `gh secret set` для полученных значений. Локальный
`make up` использует тот же `backend.hcl`, поэтому локальные и CI-запуски
работают с одним состоянием.

### Секреты GitHub

| Секрет | Назначение |
|---|---|
| `YC_SA_KEY_JSON` | авторизованный ключ сервисного аккаунта `recipehub-ci` |
| `YC_CLOUD_ID`, `YC_FOLDER_ID` | параметры каталога |
| `TF_STATE_ACCESS_KEY`, `TF_STATE_SECRET_KEY` | статический ключ для S3-бэкенда |
| `APP_JWT_SECRET`, `APP_USER_DB_PASSWORD`, `APP_RECIPE_DB_PASSWORD`, `APP_RABBITMQ_PASSWORD`, `APP_ADMIN_PASSWORD` | значения для Kubernetes Secret |

Переменная `TF_STATE_BUCKET` — имя бакета с state (не секрет).

`APP_*` должны совпадать с локальным `.secrets.env`: иначе E2E-тесты,
запущенные против облака, не найдут администратора с ожидаемым паролем.

### Секреты

`make deploy` генерирует `deploy/cloud/.secrets.env` (в `.gitignore`) и создаёт
из него Kubernetes Secret `recipehub-secrets`: `JWT_SECRET`, пароли PostgreSQL,
RabbitMQ и bootstrap-админа. Файл переиспользуется между сессиями, поэтому
переменные окружения в кластере не «прыгают» от запуска к запуску.

### Образы

Образы собираются локально (`make build`) и пушатся в `cr.yandex/<registry-id>`
с тегом `git short sha` (+ `-dirty`, если рабочее дерево грязное). Приложение
не хранит данные между сессиями, поэтому пересборка при каждом запуске — норма.

## Квоты, которые пришлось поднять

Новый аккаунт Yandex Cloud приходит с очень скромными квотами на диски, и
группа узлов Managed Kubernetes требует минимум 64 ГБ на загрузочный диск:

| Квота | Было | Стало |
|---|---:|---:|
| `compute.hddDisks.size.ru-central1-a` | 20 ГиБ | 100 ГиБ |
| `compute.ssdDisks.size.ru-central1-a` | 10 ГиБ | 20 ГиБ |

Запросы создаются через CLI и обычно одобряются сразу:

```bash
yc quota-manager quota-request create \
  --resource-type resource-manager.cloud \
  --resource-id <cloud-id> \
  --desired-limit quota-id=compute.hddDisks.size.ru-central1-a,value=107374182400
```

Проверить лимиты:

```bash
yc quota-manager quota-limit list --service compute \
  --resource-type resource-manager.cloud --resource-id <cloud-id>
```

## Что уже проверено

Локальный контур (ЛР7):

- Кластер Managed Kubernetes 1.35 (зональный мастер, Calico) — `HEALTHY`.
- Один прерываемый узел 2 vCPU / 4 ГБ, диск 64 ГБ HDD.
- Все сервисы, PostgreSQL и RabbitMQ запущены в namespace `recipehub`.
- Публичный IP выдаётся `Service type=LoadBalancer` (сетевой балансировщик
  создаёт контроллер облака).
- `make smoke` — health всех сервисов и Swagger UI.
- `make test` — 52 E2E-теста, все проходят против облака.

Полный цикл через GitHub Actions (ДЗ8):

1. `ci.yml` — на push: typecheck четырёх проектов, `docker compose`, 52 E2E,
   коллекция Postman (Newman). Облако не использовалось.
2. `infra.yml action=plan` — план на 14 ресурсов, артефакт и summary.
3. `infra.yml action=apply` — 14 ресурсов создано, кластер `HEALTHY`.
4. `deploy-cloud.yml action=deploy` — 6 образов в реестре (3 сервиса +
   postgres/rabbitmq/busybox), rollout, smoke, **52/52 E2E против облака**.
5. `deploy-cloud.yml action=smoke` — повторная проверка без пересборки.
6. `infra.yml action=destroy confirm=destroy` — namespace, NLB, диски,
   образы и все Terraform-ресурсы удалены; проверка остатков пустая.

Что выяснилось на практике и уже учтено в коде:

- **Docker Hub с узлов недоступен** (`registry-1.docker.io` — i/o timeout),
  поэтому postgres, rabbitmq и busybox зеркалируются в Container Registry
  (`scripts/mirror-images.sh`), манифесты ссылаются на `__REGISTRY__`.
- **StatefulSet не заменяет под, зависший в `ImagePullBackOff`** — он ждёт
  `Ready`. `scripts/cleanup-stale-pods.sh` удаляет поды со старым тегом.
- **Rollout на одном узле упирается в CPU**: во время обновления старые и
  новые поды сосуществуют, requests доходят до 95 % и Cluster Autoscaler
  добавляет второй узел. Для ЛР8 это готовый сценарий для HPA/тюнинга.

## Правила безопасности и экономии

1. **Не пушить в `main` до отдельного решения.** Работаем в `feature/cloud`.
2. **Перед merge отключить старый VPS-деплой.** В этой ветке
   `.github/workflows/deploy.yml` переименован в
   `deploy-vps.yml.disabled`: VPS удалён, и старый workflow не должен
   пытаться SSH на старый IP.
3. **Не создавать ресурсы без `terraform plan`.** Первый `apply` — только
   после просмотра плана и понимания, что именно стоит денег.
4. **Всегда удалять стенд после сессии** — `make down` локально или
   `gh workflow run infra.yml -f action=destroy -f confirm=destroy`. Затем
   `make status` и проверка биллинга: кластер, диски, публичные IP, NLB.
5. **Бюджетный алерт** в Yandex Cloud Billing на 300–500 ₽/мес.
6. **Никаких секретов в git.** `terraform.tfstate`, `.secrets.env`,
   `terraform.tfvars` — в `.gitignore`.

## Что дальше

1. ~~ДЗ7 — технический дизайн облачной инфраструктуры~~ — готов:
   [`docs/cloud/technical-design.md`](../../docs/cloud/technical-design.md).
2. ~~ДЗ8 — CI/CD в GitHub Actions~~ — готово: `ci.yml`, `deploy-cloud.yml`,
   `infra.yml` (см. раздел «CI/CD» выше).
3. ДЗ9 — MkDocs, Postman environment для облака, OpenAPI `servers`.
4. ДЗ10 / ЛР8 — k6, HPA и лимиты ресурсов (в кластере уже включён
   Cluster Autoscaler, чтобы это не пересоздавать).

## Проверка без облака

`terraform validate`, `terraform plan` и `kubectl apply --dry-run=client`
работают без создания платных ресурсов:

```bash
cd deploy/cloud/terraform
terraform init -backend=false
terraform validate

cd ../..
kubectl apply --dry-run=client -f deploy/cloud/k8s/
```
