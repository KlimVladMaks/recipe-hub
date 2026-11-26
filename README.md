# RecipeHub

[![CI](https://github.com/KlimVladMaks/recipe-hub/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/KlimVladMaks/recipe-hub/actions/workflows/ci.yml)
[![Docs](https://github.com/KlimVladMaks/recipe-hub/actions/workflows/docs.yml/badge.svg?branch=main)](https://klimvladmaks.github.io/recipe-hub/)

Сервис для обмена рецептами и кулинарных блогов. Учебный проект (ИТМО, «Бэкенд-разработка»),
реализованный как набор микросервисов на Node.js + TypeScript.

## Документация

- **Сайт** (MkDocs Material, GitHub Pages): <https://klimvladmaks.github.io/recipe-hub/> —
  архитектура, быстрый старт, API, Postman, тестирование и технический дизайн.
- **OpenAPI / Swagger UI**: спецификация `docs/openapi.yaml`, интерактивная страница
  `/api-docs` и JSON `/openapi.json` на шлюзе после запуска.
- **Postman**: коллекция и окружения в `tests/postman/` (52 запроса, сквозной сценарий).

Сайт собирается из каталога `docs/` той же кодовой базой, что и приложение, поэтому
документация не отстаёт от кода. Локальная проверка:

```bash
python3 -m venv .venv-docs && .venv-docs/bin/pip install -r requirements-docs.txt
.venv-docs/bin/mkdocs serve        # http://127.0.0.1:8000/recipe-hub/
```


## Возможности

- Регистрация и вход по JWT, смена пароля, роли (`user` / `admin`).
- Личный кабинет: свои рецепты (включая черновики), сохранённые рецепты.
- Поиск рецептов с фильтрацией по типу блюда, сложности и ингредиентам.
- Страница рецепта: медиа, пошаговые инструкции с медиа.
- Социальные функции: рейтинги, комментарии, лайки комментариев, подписки и персональная лента.

## Архитектура

```text
                        ┌───────────────────────────┐
   HTTP :3000  ────────▶│        api-gateway        │  JWT → x-user-id / x-user-role
                        │  роутинг, лента, Swagger  │
                        └───────┬───────────┬───────┘
                                │           │
                 HTTP /api/internal/*       │ HTTP /api/internal/*
                                ▼           ▼
                        ┌────────────┐  ┌────────────┐
                        │ user :3001 │  │recipe :3002│
                        │  user-db   │  │ recipe-db  │
                        └─────┬──────┘  └─────▲──────┘
                              │  RabbitMQ     │
                              │ user.created  │
                              └ user.deleted ─┘
```

| Сервис        | Порт | Назначение                                   |
| ------------- | ---- | -------------------------------------------- |
| `api-gateway` | 3000 | JWT-аутентификация, проксирование, лента, Swagger |
| `user`        | 3001 | пользователи, авторизация, подписки          |
| `recipe`      | 3002 | рецепты, шаги, комментарии, рейтинги, сохранения |

- **API-шлюз** — единственная точка входа. Проверяет JWT и прокидывает в сервисы заголовки
  `x-user-id` / `x-user-role`. Сервисы `user` и `recipe` доверяют этим заголовкам.
- **recipe → user** — синхронно по HTTP (`/api/internal/users*`), чтобы подмешивать авторов.
- **user → recipe** — асинхронно через RabbitMQ (topic exchange `user-exchange`,
  события `user.created` / `user.deleted`); recipe каскадно удаляет данные удалённого пользователя.
- У каждого сервиса своя БД Postgres (`database-per-service`).
- Маршруты `/api/internal/*` доступны только внутри docker-сети и наружу не проксируются.

## Быстрый старт (Docker)

```bash
docker compose up -d --build
```

Миграции Prisma применяются автоматически при старте `user-service` и `recipe-service`
(`prisma migrate deploy` в команде запуска контейнера).

После запуска:

- API: <http://localhost:3000/api>
- Swagger UI: <http://localhost:3000/api-docs>
- RabbitMQ UI: <http://localhost:15672> (guest / guest)

## Развёртывание на VPS (ЛР4 / Ansible)

Всё, что нужно для развёртывания на удалённом сервере, лежит в каталоге `deploy/`
(принцип Infrastructure as Code). Настройка сервера и деплой описаны декларативно
средствами **Ansible** (`deploy/ansible/`: playbooks, роли, инвентарь). На чистом
сервере Ubuntu достаточно трёх команд:

```bash
ssh root@<IP_СЕРВЕРА>
apt update && apt install -y git
git clone https://github.com/KlimVladMaks/recipe-hub.git /opt/recipe-hub
bash /opt/recipe-hub/deploy/scripts/setup-server.sh
```

Скрипт ставит Ansible и запускает `site.yml`: Docker, swap, UFW, nginx (обратный
прокси), `services/*/.env` из `.env.example` и запуск стека. Обновление — одной
командой: `bash /opt/recipe-hub/deploy/scripts/deploy.sh` (запускает `deploy.yml`).
Playbook-и идемпотентны: повторный прогон ничего не меняет.

Вместе с приложением поднимается **мониторинг**: Grafana, Prometheus, Loki,
Promtail, node-exporter, cAdvisor и blackbox-exporter
(`deploy/docker-compose.monitoring.yml`). Наружу он не публикуется — Grafana
открывается через SSH-туннель:

```bash
ssh -L 3300:127.0.0.1:3300 root@<IP_СЕРВЕРА>
# затем http://localhost:3300 — дашборд «RecipeHub — мониторинг»
```

Дашборд показывает потребление CPU/RAM/диска/сети на ВМ, healthcheck всех
сервисов и логи всех контейнеров.

Подробности, схема, секреты, TLS, туннели и команды Ansible — в
[`deploy/README.md`](deploy/README.md).

## Облачный стенд (Yandex Cloud)

Сейчас основной стенд для раздела 4 дисциплины — одноразовый кластер
Yandex Managed Service for Kubernetes. Он поднимается через Terraform только
на время тестов/защиты и удаляется командой `down`, чтобы не платить за
простой. План, архитектура и правила экономии — в
[`deploy/cloud/README.md`](deploy/cloud/README.md).

Технический дизайн облачной инфраструктуры (ДЗ7): архитектурные решения,
облачные ресурсы, сетевая связность, отказоустойчивость, безопасность,
стоимость и production-вариант — в
[`docs/cloud/technical-design.md`](docs/cloud/technical-design.md).

## CI/CD

- **CI** (`.github/workflows/ci.yml`) — на каждый push и PR: проверка типов всех
  сервисов, линт OpenAPI (`redocly lint`), сборка docker compose, 52 E2E-теста и
  коллекция Postman. Облако не используется, прогон бесплатный.
- **CD** (`deploy-cloud.yml`) — только вручную: сборка и пуш образов в Container
  Registry, деплой в Kubernetes, smoke и E2E против облачного стенда.
- **Инфраструктура** (`infra.yml`) — только вручную: `terraform plan`, затем
  `apply` или `destroy` после подтверждения.
- **Документация** (`docs.yml`) — строгая сборка MkDocs на PR и публикация сайта
  на GitHub Pages из `main`.

Деплой и Terraform требуют подтверждения в GitHub Environment `cloud-stand`,
поэтому push в ветку не может создать платный кластер. Подробности и команды —
в [`deploy/cloud/README.md`](deploy/cloud/README.md#cicd-дз8).

> VPS из ЛР4/ЛР5/ЛР6 удалён после защиты. Старый workflow автодеплоя на VPS
> отключён (`.github/workflows/deploy-vps.yml.disabled`); не включайте его без
> реального сервера и обновлённых секретов.

## Запуск сервиса локально

```bash
cd services/<service>
npm install
npm start          # tsx src/server.ts
```

Для локального запуска скопируйте `.env.example` в `.env` в каталоге сервиса и при необходимости
поправьте хосты БД/RabbitMQ на `localhost` (порты см. в `docker-compose.yml`).

## Полезные команды

```bash
npm run typecheck                       # tsc --noEmit
npm run prisma:generate                 # после изменения schema.prisma
npm run prisma:migrate                  # prisma migrate deploy (в контейнере)
docker compose logs -f user-service     # логи сервиса
```

## Тестирование

В репозитории есть E2E-тесты «чёрного ящика» в каталоге `tests/` — они ходят только
через API-шлюз по HTTP и не лезут во внутренний код сервисов. Стек: встроенный
`node:test` + `assert`, запуск через `tsx` (без Jest/Vitest).

```bash
# стек уже поднят
cd tests
npm install
npm test

# одной командой: поднять стек и сразу прогнать тесты
cd tests
npm install
npm run test:stack
```

Тесты покрывают базовые сценарии: health, регистрация/вход/профиль, CRUD рецептов,
фильтры и черновики, шаги, комментарии и лайки, рейтинги, сохранения, подписки и ленту,
а также админские операции со справочниками. Все созданные данные удаляются в конце
прогона, поэтому мусор в БД не остаётся. Подробности — в `tests/README.md`.

### Администратор для разработки

Зарегистрировать админа через API нельзя (регистрация всегда выдаёт роль `user`, а менять
роль может только админ). Чтобы решить эту проблему, `user-service` при старте идемпотентно
создаёт администратора из переменных `ADMIN_USERNAME` / `ADMIN_PASSWORD` в
`services/user/.env` (по умолчанию `admin` / `admin123`). После смены значений перезапустите
`user-service`. Это упрощает ручную проверку админских эндпоинтов через Swagger/curl и
используется в тестах.

## Структура репозитория

```text
services/
  api-gateway/     # шлюз, CommonJS
  user/            # user-service, ESM
  recipe/          # recipe-service, ESM
docs/
  openapi.yaml     # OpenAPI-спецификация публичного и внутреннего API
  index.md         # главная страница сайта документации (MkDocs)
tests/             # E2E-тесты (node:test + tsx) и Postman-коллекция
deploy/            # Infrastructure as Code: nginx, скрипты, prod-compose, мониторинг
.github/workflows/ # CI/CD: проверки, деплой в облако, публикация документации
mkdocs.yml         # конфигурация сайта документации (Material)
docker-compose.yml
AGENTS.md          # заметки для ИИ-агентов и разработчиков
```

## Документация API

- `docs/openapi.yaml` — актуальная OpenAPI 3 спецификация (публичные и `internal` маршруты);
  проверяется `redocly lint` в CI (`npx @redocly/cli@2.84.0 lint docs/openapi.yaml`).
- Swagger UI в шлюзе: `/api-docs`, JSON-версия спеки — `/openapi.json`.
- Postman: `tests/postman/` — коллекция (52 запроса) и окружения `local`/`cloud`;
  запуск — `cd tests && npm run test:postman` (newman). Подробности —
  `tests/postman/README.md`.
- Сайт документации: <https://klimvladmaks.github.io/recipe-hub/>; страницы лежат
  в `docs/`, сборка — `mkdocs build --strict`.

## Prisma

Клиент генерируется в `src/generated/prisma` (в git не хранится). После свежего клона или
изменения `schema.prisma`:

```bash
npx prisma generate
```

Миграции применяются автоматически при старте сервисных контейнеров. Вручную (например, после
изменения схемы) их можно применить командой `npx prisma migrate deploy` внутри контейнера.
`DATABASE_URL` в `.env` использует docker-хосты (`user-db`, `recipe-db`), поэтому команды Prisma
выполняются в контейнере, а не на хосте.
