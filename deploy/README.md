# Развёртывание RecipeHub на удалённом сервере (VPS)

Инструкция для ЛР4: развёртывание приложения на чистом VPS с Ubuntu и настройка
nginx в режиме обратного прокси.

Вся конфигурация хранится в репозитории (принцип **Infrastructure as Code**) в
каталоге `deploy/`. Свежий сервер поднимается **тремя командами**, а обновление —
**одной**.

## Структура `deploy/`

```
deploy/
├── README.md                    # этот файл
├── docker-compose.prod.yml      # прод-оверрайд: 127.0.0.1-порты, ротация логов, restart
├── nginx/
│   └── recipe-hub.conf          # конфиг обратного прокси (+ TLS-заготовка)
└── scripts/
    ├── setup-server.sh          # первичная настройка VPS и развёртывание
    └── deploy.sh                # обновление кода (используется и в CI на ДЗ6)
```

## Архитектура развёртывания

```text
                    Интернет
                       │ :80 (и :443 при наличии TLS)
                       ▼
              ┌──────────────────┐
              │      nginx       │  /api/internal/ → 403
              │ (reverse proxy)  │
              └────────┬─────────┘
                       │ 127.0.0.1:3000
                       ▼
              ┌──────────────────┐
              │   api-gateway    │
              └────────┬─────────┘
                       │ docker-сеть
          ┌────────────┴────────────┐
          ▼                         ▼
   user-service :3001        recipe-service :3002
   user-db (5433→127.0.0.1)  recipe-db (5434→127.0.0.1)
          └──────── RabbitMQ :5672 ────────┘
```

Наружу открыт **только nginx** (80/443). Порт шлюза `3000` и порты БД/RabbitMQ
привязаны к `127.0.0.1` (см. `docker-compose.prod.yml`), поэтому снаружи они
недоступны. Внутренние маршруты `/api/internal/*` дополнительно блокируются на
уровне nginx.

## Требования

- VPS с Ubuntu 22.04 / 24.04 (проверено под 24.04), root-доступ по SSH.
- Минимум 2 ГБ RAM (скрипт добавит swap — он нужен, чтобы сборка образов не
  упала по OOM).
- Открытые порты: `22/tcp` (SSH), `80/tcp`, `443/tcp`. Порты БД и RabbitMQ
  открывать не нужно.

## Быстрый старт (свежий сервер)

Подключись по SSH и выполни **три команды**:

```bash
ssh root@<IP_СЕРВЕРА>

apt update && apt install -y git

git clone https://github.com/KlimVladMaks/recipe-hub.git /opt/recipe-hub
bash /opt/recipe-hub/deploy/scripts/setup-server.sh
```

`setup-server.sh` автоматически:

1. обновит систему и поставит базовые утилиты;
2. создаст swap-файл 2 ГБ;
3. установит Docker Engine и `docker compose` (compose-plugin);
4. настроит UFW (разрешит SSH/80/443) и ротацию docker-логов;
5. склонирует репозиторий в `/opt/recipe-hub` и сгенерирует `services/*/.env`
   из `.env.example`;
6. установит nginx и подключит `deploy/nginx/recipe-hub.conf`;
7. соберёт и запустит стек с прод-оверрайдом;
8. дождётся готовности API и напечатает адреса.

### Альтернатива: одна команда

```bash
ssh root@<IP_СЕРВЕРА>
curl -fsSL https://raw.githubusercontent.com/KlimVladMaks/recipe-hub/main/deploy/scripts/setup-server.sh | bash
```

Скрипт сам клонирует репозиторий в `/opt/recipe-hub`.

## Проверка после развёртывания

```bash
# на сервере
curl http://127.0.0.1:3000/api/api-gateway-health

# с локальной машины
curl http://<IP_СЕРВЕРА>/api/api-gateway-health
```

Открой в браузере:

- API health: `http://<IP_СЕРВЕРА>/api/api-gateway-health`
- Swagger UI: `http://<IP_СЕРВЕРА>/api-docs`

## Обновление приложения

После пуша нового кода в `main`:

```bash
bash /opt/recipe-hub/deploy/scripts/deploy.sh
```

Скрипт сделает `git pull`, пересоберёт образы, перезапустит стек, удалит
неиспользуемые образы и проверит health. Этот же скрипт вызывается из
GitHub Actions — см. раздел «Автодеплой (GitHub Actions)».

## Автодеплой (GitHub Actions)

Обновление на VPS выполняется автоматически при пуше в ветку `main` через
GitHub Actions. Workflow — `.github/workflows/deploy.yml`.

```text
git push origin main
        │
        ▼
GitHub Actions runner (ubuntu-latest)
        │  ssh (ключ из repository secrets)
        ▼
VPS 139.100.225.216
        │  bash /opt/recipe-hub/deploy/scripts/deploy.sh
        ▼
git pull → docker compose up -d --build → health-check
```

Логика workflow:

- триггер — `push` только в `main` (работа в других ветках сборку на сервере не
  запускает), плюс ручной запуск (`workflow_dispatch`);
- `concurrency: deploy-production` без отмены — два пуша подряд не запускают
  параллельные сборки на слабом сервере;
- runner подключается к VPS по SSH отдельным ключом и вызывает тот же
  `deploy/scripts/deploy.sh`, что и при ручном обновлении;
- в конце — smoke-test: `curl http://<IP>/api/api-gateway-health` уже снаружи,
  через nginx.

### Секреты репозитория

Ключ и адрес хранятся в **Settings → Secrets and variables → Actions →
Repository secrets** (в git не попадают):

| Secret | Назначение |
| --- | --- |
| `SSH_HOST` | IP/домен VPS |
| `SSH_USER` | пользователь для деплоя (`root`) |
| `SSH_PRIVATE_KEY` | приватный CI-ключ (ed25519) |

Для CI используется **отдельный** SSH-ключ (не личный): его публичная часть
добавлена в `~/.ssh/authorized_keys` на сервере, приватная — в
`SSH_PRIVATE_KEY`. При необходимости ключ можно отозвать, удалив строку из
`authorized_keys`, не затрагивая личный доступ.

### Ручной запуск и логи

```bash
# список прогонов
gh run list

# ручной перезапуск деплоя
gh workflow run deploy.yml

# следить за последним прогоном
gh run watch
```

Также прогоны и логи видны на GitHub: вкладка **Actions**. Повторный прогон
идемпотентен — `deploy.sh` безопасно вызывать несколько раз.

## Секреты и переменные окружения

Файлы `services/*/.env` **не хранятся в git** (в репозитории только
`.env.example`). Схема такая:

- `.env.example` содержит тестовые MVP-значения и используется локально;
- на сервере `setup-server.sh` копирует `.env.example` → `.env`;
- сгенерированные `.env` попадают в `.gitignore`, поэтому `git pull` их не
  перезаписывает.

Это даёт задел под продакшен: чтобы уйти от тестовых секретов, достаточно
отредактировать `services/*/.env` прямо на сервере (например, поменять
`JWT_SECRET`, пароль админа, креды БД/RabbitMQ) и перезапустить стек:

```bash
cd /opt/recipe-hub
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d
```

> `JWT_SECRET` должен совпадать во всех трёх сервисах, иначе шлюз не сможет
> проверять токены. Меняй его сразу во всех `services/*/.env`.

## Полезные операции

```bash
cd /opt/recipe-hub
COMPOSE="-f docker-compose.yml -f deploy/docker-compose.prod.yml"

# статус контейнеров
docker compose $COMPOSE ps

# логи всех сервисов / одного сервиса
docker compose $COMPOSE logs -f
docker compose $COMPOSE logs -f api-gateway

# остановить стек (данные в томах сохраняются)
docker compose $COMPOSE down

# остановить и удалить данные
docker compose $COMPOSE down -v
```

### RabbitMQ UI через SSH-туннель

RabbitMQ Management слушает `127.0.0.1:15672` и снаружи недоступен. Пробрось
порт по SSH с локальной машины:

```bash
ssh -L 15672:127.0.0.1:15672 root@<IP_СЕРВЕРА>
```

Затем открой <http://localhost:15672> (`guest` / `guest`).

Аналогично можно смотреть Prisma Studio (профиль `prisma-studio`) на
`127.0.0.1:5555` / `5556`.

## nginx и HTTPS

Конфиг рассчитан на работу **по IP** (`server_name _`). Когда появится домен,
направленный на сервер, включи HTTPS так:

1. Поправь `deploy/nginx/recipe-hub.conf`: замени `server_name _;` на свой домен,
   закоммить и скопируй конфиг на сервер (или отредактируй сразу на сервере).
2. Выпусти сертификат:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d recipe-hub.example.com
```

Certbot сам добавит `listen 443 ssl` и автопродление. Готовый закомментированный
TLS-блок и инструкция есть в конце `deploy/nginx/recipe-hub.conf`.

## Запуск E2E-тестов против развёрнутого сервера

Тесты чёрного ящика ходят через API-шлюз по HTTP, поэтому их можно направить на
удалённый сервер с локальной машины:

```bash
cd tests
npm install
TEST_BASE_URL=http://<IP_СЕРВЕРА>/api npm test
```

## Восстановление на новом сервере

Если сервер вышел из строя, возьми новый VPS и повтори раздел
«Быстрый старт» — конфигурация и скрипты лежат в репозитории, ничего
восстанавливать вручную не нужно.
