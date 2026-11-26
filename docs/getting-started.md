# Быстрый старт

## Требования

- Docker Engine 24+ и Docker Compose v2.
- Node.js 20+ — только для запуска тестов и линтеров на хосте (сами сервисы
  работают в контейнерах).

## Запуск

```bash
git clone https://github.com/KlimVladMaks/recipe-hub.git
cd recipe-hub

# .env в git не хранятся — создаём из примеров
for service in api-gateway user recipe; do
  cp "services/$service/.env.example" "services/$service/.env"
done

docker compose up -d --build
```

`JWT_SECRET` в примерах одинаковый (`change-me`), поэтому шлюз и сервисы
договорятся «из коробки». Для чего-то кроме локальной проверки замените его на
случайную строку **во всех трёх файлах** — иначе шлюз не примет токены,
выписанные `user-service`.

Миграции Prisma применяются автоматически при старте контейнеров
(`prisma migrate deploy`).

## Куда смотреть после запуска

| Адрес | Что это |
|---|---|
| <http://localhost:3000/api> | API через шлюз |
| <http://localhost:3000/api-docs/> | Swagger UI |
| <http://localhost:3000/openapi.json> | OpenAPI-спецификация в JSON |
| <http://localhost:15672> | RabbitMQ UI (`guest` / `guest`) |
| <http://localhost:5555> | Prisma Studio для `user-db` |

Проверка живости:

```bash
curl http://localhost:3000/api/api-gateway-health
curl http://localhost:3000/api/user-service-health
curl http://localhost:3000/api/recipe-service-health
```

## Администратор

Зарегистрировать админа через API нельзя: регистрация всегда выдаёт роль `user`.
`user-service` при старте идемпотентно создаёт администратора из переменных
`ADMIN_USERNAME` / `ADMIN_PASSWORD` (по умолчанию `admin` / `admin123`) — это
служебная seed-запись для ручных проверок и тестов. После изменения переменных
перезапустите `user-service`:

```bash
docker compose up -d --force-recreate user-service
```

## Полезные команды

```bash
docker compose logs -f user-service      # логи сервиса
docker compose ps                        # состояние контейнеров
docker compose down                      # остановить, данные сохранятся
docker compose down -v                   # остановить и удалить volumes с БД
```

## Тесты

```bash
cd tests
npm install
npm test              # стек уже поднят
npm run test:stack    # поднять стек и сразу прогнать E2E
```

О тестах — в разделе [Тестирование](testing.md).

## Если что-то не запустилось

- **Порт занят** — проверьте `3000`, `3001`, `3002`, `5433`, `5434`, `15672`;
  освободите порт или поправьте `docker-compose.yml`.
- **`401` на все запросы** — разные `JWT_SECRET` в `services/*/.env`.
- **`ImagePullBackOff`/долгая сборка** — первый запуск скачивает образы
  PostgreSQL и RabbitMQ; повторный `docker compose up -d --build` обычно решает
  проблему.
- **Prisma-клиент не найден** — выполните `npx prisma generate` в каталоге
  сервиса (клиент генерируется и не хранится в git).
