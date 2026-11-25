# Облачный стенд RecipeHub (Yandex Cloud)

Учебный, **одноразовый** стенд для ДЗ7 / ЛР7 / ДЗ8 / ДЗ9. Основная идея:
пока стенд нужен — он работает; после тестов и защиты — удаляется, и мы за
него не платим.

> Статус: инфраструктура и манифесты готовы, стенд проверяется на живом
> кластере. CI/CD, ДЗ7 и ДЗ9 — следующие шаги.

## Архитектура

```text
Интернет
   │  HTTP :80
   ▼
Yandex NLB (публичный IP)
   │
   ▼
ingress-nginx (в кластере)
   │
   ▼
api-gateway :3000
   ├── user-service :3001 ── user-db (PostgreSQL, PVC)
   └── recipe-service :3002 ─ recipe-db (PostgreSQL, PVC)
                         └── RabbitMQ
```

- **Managed Service for Kubernetes**: зональный мастер `s-c2-m8`,
  одна группа узлов (1 × preemptible 2 vCPU / 4 ГБ, `standard-v4a`,
  boot disk 64 ГБ HDD, публичный IP).
- **PostgreSQL и RabbitMQ** — внутри кластера, без Managed-сервисов:
  для учебного стенда это заметно дешевле, а данные между сессиями
  всё равно не сохраняются.
- **Container Registry** — образы собираются в GitHub Actions.
- **NLB** — создаётся автоматически из `Service type=LoadBalancer`
  для ingress-nginx.
- **Секреты** — K8s Secrets из GitHub Secrets или локального
  `.secrets.env` (в git не попадает).

Production-вариант (для текста ДЗ7) отличается: три зоны, региональный
мастер, несколько узлов, Managed PostgreSQL, ALB + TLS, Lockbox, Monium
и регулярные бэкапы. В стенде эти вещи сознательно не поднимаются, чтобы
не платить за избыточную для учебной задачи инфраструктуру.

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
Остановленный кластер (`pause`) — ~1,7 ₽/час, полностью удалённый (`down`) —
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

### Секреты

`make deploy` генерирует `deploy/cloud/.secrets.env` (в `.gitignore`) и создаёт
из него Kubernetes Secret `recipehub-secrets`: `JWT_SECRET`, пароли PostgreSQL,
RabbitMQ и bootstrap-админа. Файл переиспользуется между сессиями, поэтому
переменные окружения в кластере не «прыгают» от запуска к запуску.

### Образы

Образы собираются локально (`make build`) и пушатся в `cr.yandex/<registry-id>`
с тегом `git short sha` (+ `-dirty`, если рабочее дерево грязное). Приложение
не хранит данные между сессиями, поэтому пересборка при каждом запуске — норма.

## Правила безопасности и экономии

1. **Не пушить в `main` до отдельного решения.** Работаем в `feature/cloud`.
2. **Перед merge отключить старый VPS-деплой.** В этой ветке
   `.github/workflows/deploy.yml` переименован в
   `deploy-vps.yml.disabled`: VPS удалён, и старый workflow не должен
   пытаться SSH на старый IP.
3. **Не создавать ресурсы без `terraform plan`.** Первый `apply` — только
   после просмотра плана и понимания, что именно стоит денег.
4. **Всегда `make down` после сессии.** Затем `make status` и проверка
   биллинга: кластер, диски, публичные IP, NLB.
5. **Бюджетный алерт** в Yandex Cloud Billing на 300–500 ₽/мес.
6. **Никаких секретов в git.** `terraform.tfstate`, `.secrets.env`,
   `terraform.tfvars` — в `.gitignore`.

## Что дальше

1. ДЗ7 — технический дизайн облачной инфраструктуры (`docs/cloud/`).
2. ДЗ8 — GitHub Actions: сборка/пуш образов, деплой в кластер, отдельный
   workflow для Terraform (`plan` / `apply` / `destroy` по кнопке).
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
