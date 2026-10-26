# Развёртывание RecipeHub на удалённом сервере (VPS)

Инструкция для ЛР4 / ДЗ по Ansible: развёртывание приложения на чистом VPS с
Ubuntu, настройка nginx в режиме обратного прокси и управление сервером
средствами **Ansible**.

Вся конфигурация хранится в репозитории (принцип **Infrastructure as Code**) в
каталоге `deploy/`. Свежий сервер поднимается **тремя командами**, а обновление —
**одной**. Настройка самого сервера описана декларативно в Ansible-ролях, а не
в императивном bash-скрипте: повторный прогон playbook-а ничего не меняет.

## Структура `deploy/`

```
deploy/
├── README.md                    # этот файл
├── docker-compose.prod.yml      # прод-оверрайд: 127.0.0.1-порты, ротация логов, restart
├── docker-compose.monitoring.yml # стек мониторинга: Grafana, Prometheus, Loki, ...
├── monitoring/                  # конфиги мониторинга (провижининг Grafana, Loki, ...)
├── ansible/                     # вся настройка сервера и деплой
│   ├── ansible.cfg              # инвентарь по умолчанию, путь к ролям и коллекциям
│   ├── requirements.yml         # коллекция community.general (ufw, timezone)
│   ├── inventory/prod.yml       # хост recipe-hub; IP/юзер/ключ берутся из env
│   ├── group_vars/all.yml       # app_dir, repo_url, branch, compose, nginx, swap
│   ├── site.yml                 # «каким должен быть сервер» + первый деплой
│   ├── deploy.yml               # обновление кода и пересборка (вызывается из CI)
│   └── roles/
│       ├── common/              # базовые пакеты, часовой пояс, swap
│       ├── docker/              # Docker Engine, compose-plugin, ротация логов
│       ├── firewall/            # UFW: SSH / 80 / 443
│       ├── nginx/               # обратный прокси (шаблон конфига + handler)
│       └── app/                 # код, services/*/.env, стек, health-check
└── scripts/
    ├── setup-server.sh          # бутстрап: ставит Ansible и запускает site.yml
    └── deploy.sh                # обновление кода: запускает deploy.yml
```

Раньше `setup-server.sh` сам ставил Docker, swap, UFW и nginx. Теперь это роли
playbook-а, а скрипты остались тонкими обёртками, чтобы привычные команды из
этого README продолжали работать.

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

Управление сервером:

```text
   ноутбук (WSL)  ─┐
                   ├─ SSH ──▶ VPS ──▶ ansible-playbook site.yml / deploy.yml
   GitHub Actions ─┘
```

## Требования

- VPS с Ubuntu 22.04 / 24.04 (проверено под 24.04), root-доступ по SSH.
- Минимум 2 ГБ RAM (playbook добавит swap — он нужен, чтобы сборка образов не
  упала по OOM).
- Открытые порты: `22/tcp` (SSH), `80/tcp`, `443/tcp`. Порты БД и RabbitMQ
  открывать не нужно.
- Ansible ставится автоматически: `setup-server.sh` поднимет `ansible-core`
  (из apt, при необходимости — в `/opt/ansible-venv`) и коллекцию
  `community.general`.

## Быстрый старт (свежий сервер)

Подключись по SSH и выполни **три команды**:

```bash
ssh root@<IP_СЕРВЕРА>

apt update && apt install -y git

git clone https://github.com/KlimVladMaks/recipe-hub.git /opt/recipe-hub
bash /opt/recipe-hub/deploy/scripts/setup-server.sh
```

`setup-server.sh` — это бутстрап Ansible. Он:

1. ставит `ansible-core` >= 2.16 (сначала пробует apt, при неудаче — venv) и
   коллекцию `community.general`;
2. запускает `deploy/ansible/site.yml` с локальным подключением (`-c local`).

Дальше всё делает playbook:

| Роль | Что настраивает |
| --- | --- |
| `common` | кэш apt, базовые пакеты, часовой пояс, swap 2 ГБ (в `/etc/fstab`) |
| `docker` | GPG-ключ и репозиторий Docker, `docker-ce` + compose-plugin, `/etc/docker/daemon.json` с ротацией логов, включение сервиса |
| `firewall` | UFW: `22/80/443` открываются **до** включения файрвола, политики по умолчанию |
| `nginx` | установка, конфиг из шаблона, symlink в `sites-enabled`, удаление дефолтного сайта, `nginx -t` перед reload |
| `app` | `git clone/pull` в `app_dir`, `services/*/.env` из `.env.example`, `docker compose up -d --build`, ожидание health-эндпоинта |

### Альтернатива: одна команда

```bash
ssh root@<IP_СЕРВЕРА>
curl -fsSL https://raw.githubusercontent.com/KlimVladMaks/recipe-hub/main/deploy/scripts/setup-server.sh | bash
```

Скрипт сам клонирует репозиторий в `/opt/recipe-hub` (playbook-у нужен сам
репозиторий) и запускает `site.yml`.

## Ansible: повседневные команды

Все команды — из каталога `deploy/ansible` (Ansible ищет `ansible.cfg` в текущем
каталоге).

### С ноутбука по SSH

```bash
cd deploy/ansible

export SSH_HOST=<IP_СЕРВЕРА>            # те же имена, что у секретов GitHub Actions
export SSH_USER=root
export SSH_KEY=~/.ssh/id_ed25519        # необязательно, это значение по умолчанию

ansible-playbook deploy.yml             # обновить приложение
ansible-playbook site.yml               # настройка сервера + деплой
```

IP и пользователь в git не хранятся — инвентарь берёт их из переменных
окружения (`deploy/ansible/inventory/prod.yml`).

### На самом VPS

```bash
cd /opt/recipe-hub/deploy/ansible

ansible-playbook -i localhost, -c local site.yml
ansible-playbook -i localhost, -c local deploy.yml
```

Именно так работают обёртки `deploy/scripts/*.sh`.

### Полезное

```bash
# предпросмотр: что изменится, без применения
ansible-playbook site.yml --check --diff

# только одна часть конфигурации
ansible-playbook site.yml --tags nginx
ansible-playbook site.yml --tags docker,firewall
ansible-playbook site.yml --skip-tags swap

# дерево инвентаря
ansible-inventory --graph

# проверка синтаксиса
ansible-playbook site.yml --syntax-check
```

### Идемпотентность

Playbook можно (и нужно) гонять повторно — он приводит сервер к описанному
состоянию, а не «выполняет команды заново». Проверка:

```bash
ansible-playbook -i localhost, -c local site.yml --tags common,docker,firewall,nginx
# → PLAY RECAP: changed=0
```

Единственная задача, которая всегда показывает `changed`, — `Собрать и
запустить стек` (роль `app`): пересборка образов и есть деплой, даже если код не
изменился. При этом `deploy.yml` (используется в CI) запускает только роль
`app` и не переустанавливает пакеты.

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

Скрипт запускает `deploy.yml`: `git pull` → пересборка образов → health-check.
Этот же playbook вызывается из GitHub Actions — см. раздел «Автодеплой».

## Автодеплой (GitHub Actions)

Обновление на VPS выполняется автоматически при пуше в ветку `main` через
GitHub Actions. Workflow — `.github/workflows/deploy.yml`.

```text
git push origin main
        │
        ▼
GitHub Actions runner (ubuntu-latest)
        │  ставит ansible-core + community.general
        │  ssh (ключ из repository secrets)
        ▼
VPS 139.100.225.216
        │  ansible-playbook deploy.yml  (роль app)
        ▼
git pull → docker compose up -d --build → health-check
```

Логика workflow:

- триггер — `push` только в `main` (работа в других ветках сборку на сервере не
  запускает), плюс ручной запуск (`workflow_dispatch`);
- `concurrency: deploy-production` без отмены — два пуша подряд не запускают
  параллельные сборки на слабом сервере;
- runner выкачивает репозиторий (нужен playbook), ставит Ansible в venv и
  применяет `deploy/ansible/deploy.yml` по SSH: `SSH_HOST`, `SSH_USER` и
  `SSH_KEY` передаются инвентарю через переменные окружения;
- в конце — smoke-test: `curl http://<IP>/api/api-gateway-health` уже снаружи,
  через nginx.

Полная настройка сервера (`site.yml`) из CI **не** запускается: она меняет
пакеты, файрвол и конфиг nginx и нужна только при первичной настройке или
осознанном изменении инфраструктуры.

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

# прогнать workflow из другой ветки (проверка изменений в CI)
gh workflow run deploy.yml --ref <ветка>

# следить за последним прогоном
gh run watch
```

Также прогоны и логи видны на GitHub: вкладка **Actions**. Повторный прогон
идемпотентен.

## Секреты и переменные окружения

Файлы `services/*/.env` **не хранятся в git** (в репозитории только
`.env.example`). Схема такая:

- `.env.example` содержит тестовые MVP-значения и используется локально;
- на сервере роль `app` копирует `.env.example` → `.env` **только если `.env`
  ещё нет** (`copy` с `force: false`);
- сгенерированные `.env` попадают в `.gitignore`, поэтому `git pull` и
  повторные прогоны playbook-а их не перезаписывают.

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

Конфиг — **шаблон** `deploy/ansible/roles/nginx/templates/recipe-hub.conf.j2`,
переменные (`server_name`, upstream, `client_max_body_size`) лежат в
`deploy/ansible/group_vars/all.yml`. Правки на сервере напрямую перезапишутся
следующим прогоном роли.

Конфиг рассчитан на работу **по IP** (`server_name _`). Когда появится домен,
направленный на сервер, включи HTTPS так:

1. Задай домен в `nginx_server_name` (`group_vars/all.yml`), закоммить и примени
   роль: `ansible-playbook site.yml --tags nginx`.
2. Выпусти сертификат:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d recipe-hub.example.com
```

Certbot сам добавит `listen 443 ssl` и автопродление. Готовый закомментированный
TLS-блок и инструкция есть в конце шаблона. Помни: правки certbot живут только
на сервере, пока TLS-блок не перенесён в шаблон.

## Мониторинг (Grafana + Prometheus + Loki + Promtail)

Стек мониторинга — **часть того же compose-проекта**: он описан в
`deploy/docker-compose.monitoring.yml` и подключён третьим `-f` в
`compose_flags` (`deploy/ansible/group_vars/all.yml`). Отдельного плейбука нет:
`docker compose up -d` поднимает приложение и мониторинг вместе.

```text
                       ┌─────────────────────────────┐
   SSH-туннель ───────▶│ Grafana 127.0.0.1:3300       │  дашборд + Explore
   (наружу не смотрит) └───────┬─────────────┬───────┘
                               │             │
                 Prometheus ───┘             └─── Loki 127.0.0.1:3100
                 127.0.0.1:9090                    ▲
                    │        │                     │ push
        ┌───────────┴──┐  ┌──┴────────────┐   ┌────┴──────┐
        │ node-exporter│  │  cAdvisor     │   │ Promtail  │
        │ :9100 (ВМ)   │  │  :8080 (конт.)│   │ (все конт.)│
        └──────────────┘  └───────────────┘   └───────────┘
                    │
             blackbox-exporter :9115 — HTTP/TCP-пробы сервисов
```

| Контейнер | Что делает | Порт |
| --- | --- | --- |
| `grafana` | UI, даташурсы и дашборд провижинятся из git | `127.0.0.1:3300` |
| `prometheus` | сбор метрик, ретенция 15 дней / 2 ГБ | `127.0.0.1:9090` |
| `loki` | хранилище логов, ретенция 7 дней | `127.0.0.1:3100` |
| `promtail` | читает логи **всех** контейнеров через docker.sock | — |
| `node-exporter` | CPU / RAM / диск / сеть самой ВМ | `127.0.0.1:9100` |
| `cadvisor` | ресурсы по каждому контейнеру | `127.0.0.1:8080` |
| `blackbox-exporter` | healthcheck сервисов (HTTP 200 / TCP connect) | `127.0.0.1:9115` |

**Наружу не публикуется ничего** — все порты привязаны к `127.0.0.1`, поэтому
Grafana открывается через SSH-туннель (так же, как RabbitMQ UI и Prisma Studio):

```bash
ssh -L 3300:127.0.0.1:3300 root@<IP_СЕРВЕРА>
# затем в браузере: http://localhost:3300
# логин admin, пароль — deploy/monitoring/.env (GF_SECURITY_ADMIN_PASSWORD)
```

### Что показывает дашборд

Дашборд **RecipeHub — мониторинг** (`deploy/monitoring/grafana/dashboards/recipe-hub.json`)
провижинится автоматически и открывается сразу после логина:

1. **Healthcheck** — «все сервисы доступны / есть проблемы», плитки по
   api-gateway, user-service, recipe-service, таблица всех проб (статус, время
   ответа, HTTP-код) и график истории падений. HTTP-пробы идут по health-эндпоинтам,
   БД и RabbitMQ проверяются TCP-коннектом.
2. **ВМ** — CPU (общий, по ядрам, iowait/steal), RAM и swap, занятость диска и
   дисковый I/O, сеть, load average.
3. **Контейнеры** — CPU / RAM / сеть по каждому контейнеру (cAdvisor).
4. **Логи** — переменная `$container`, все логи, только ошибки
   (`error|fatal|exception|panic`) и график объёма логов по контейнерам.
   Свободный поиск — Explore → Loki.

### Полезные команды на сервере

```bash
cd /opt/recipe-hub
COMPOSE="-f docker-compose.yml -f deploy/docker-compose.prod.yml -f deploy/docker-compose.monitoring.yml"

docker compose $COMPOSE ps                      # все контейнеры, включая мониторинг
docker compose $COMPOSE logs -f grafana         # логи конкретного
docker compose $COMPOSE up -d prometheus        # перечитать конфиги после правки

# проверки без Grafana
curl -s 127.0.0.1:3300/api/health               # Grafana
curl -s 127.0.0.1:3100/ready                    # Loki
curl -s 127.0.0.1:9090/-/healthy                # Prometheus
open/curl 127.0.0.1:9090/api/v1/targets         # состояние всех таргетов

# куда уходит память (VPS 2 ГБ)
docker stats --no-stream
free -h
```

Перечитать конфиг Prometheus без рестарта (включён `--web.enable-lifecycle`):

```bash
curl -X POST http://127.0.0.1:9090/-/reload
```

### Обновление дашборда и конфигов

Дашборд — обычный JSON в git. Меняй файл, коммить, пуш в `main`: деплой
перезапустит Grafana, провижининг подхватит изменения (в UI правки не
сохраняются — `allowUiUpdates: false`, источник правды только репозиторий).

Promtail находит контейнеры сам (`docker_sd_configs`), поэтому новые сервисы
появляются в логах без правки конфигов.

### Память и ретенция

На VPS 2 ГБ RAM у всех контейнеров мониторинга выставлены `mem_limit`
(суммарно ~1.1 ГБ лимитов, реально ~500 МБ). Если памяти начнёт не хватать:

1. отключи cAdvisor (панели «Контейнеры» пропадут, healthcheck и логи останутся);
2. уменьши `--storage.tsdb.retention.time` / `retention_period` у Loki.

Пароль Grafana: `deploy/monitoring/.env` (в git только `.env.example`, на
сервере файл создаётся один раз и не перезаписывается).

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
«Быстрый старт» — конфигурация и playbook-и лежат в репозитории, ничего
восстанавливать вручную не нужно.

## Частые проблемы

| Симптом | Причина и решение |
| --- | --- |
| `Не найден ansible-playbook` | обёртка запущена не после `setup-server.sh`; поставь Ansible вручную: `apt install ansible-core` + `ansible-galaxy collection install -r deploy/ansible/requirements.yml` |
| `couldn't resolve module/action 'community.general.ufw'` | не установлена коллекция: `ansible-galaxy collection install -r deploy/ansible/requirements.yml` |
| `no hosts matched` / пустой инвентарь | не задан `SSH_HOST` или playbook запущен не из `deploy/ansible` |
| `Permission denied (publickey)` | не указан ключ: `export SSH_KEY=~/.ssh/<ключ>` |
| `api не ответил за 3 минуты` | смотри логи: `docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml logs -f` (обычно нехватка RAM/swap) |
| Grafana: в дашборде «НЕТ ДАННЫХ» у логов | Promtail не видит docker.sock или Loki не готов; проверь `docker compose ... logs promtail` и `curl 127.0.0.1:3100/ready` |
| Панели «Контейнеры» пустые | cAdvisor не стартовал (несовместимость с версией Docker); `docker compose ... logs cadvisor`; при необходимости убери его из `deploy/docker-compose.monitoring.yml` |
| Контейнеры мониторинга падают с OOM | на VPS 2 ГБ: проверь `docker stats --no-stream`; убери cAdvisor и/или уменьши ретенцию Prometheus/Loki |
