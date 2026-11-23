# Облачный стенд RecipeHub (Yandex Cloud)

Учебный, **одноразовый** стенд для ДЗ7 / ЛР7 / ДЗ8 / ДЗ9. Основная идея:
пока стенд нужен — он работает; после тестов и защиты — удаляется, и мы за
него не платим.

> Статус: каркас. Terraform-провайдер и структура каталогов готовы, платные
> ресурсы ещё не создаются. Следующий шаг — VPC, IAM, Managed Kubernetes,
> Container Registry и группа узлов.

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

```bash
make up       # создать инфраструктуру и ingress, ~15–25 мин
make deploy   # выкатить приложение, ~2–5 мин
make test     # smoke + E2E + Postman
make pause    # остановить кластер на короткий перерыв
make resume   # вернуть кластер
make down     # удалить всё платное, ~10 мин
make status   # проверить, не осталось ли ресурсов
```

Пока Makefile и скрипты не добавлены — это план, а не готовые команды.

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

1. VPC + подсеть + security groups.
2. IAM: сервисные аккаунты для кластера, узлов и CI.
3. Managed K8s + node group (preemptible).
4. Container Registry.
5. K8s-манифесты приложения, PostgreSQL, RabbitMQ и ingress.
6. GitHub Actions: сборка/пуш/деплой + отдельный workflow для Terraform.
7. MkDocs, Postman environment, OpenAPI `servers`, технический дизайн ДЗ7.

Пока ни один из этих шагов не создаёт платных ресурсов: `terraform validate`
и `kubectl kustomize` можно запускать без облака.
