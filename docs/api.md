---
hide:
  - toc
---

# API

## Базовый адрес

Все публичные запросы идут через API-шлюз по пути `/api`:

- локально — `http://localhost:3000/api`;
- в облаке — `http://<IP-балансировщика>/api`.

Внутренние маршруты `/api/internal/*` шлюзом не проксируются: они доступны
только сервисам внутри кластера.

## Аутентификация

1. `POST /api/auth/register` — регистрация. Возвращает пользователя без токена.
2. `POST /api/auth/login` — вход. Возвращает `{ user, jwtToken }`.
3. Дальше токен передаётся в заголовке:

```http
Authorization: Bearer <jwtToken>
```

Шлюз проверяет подпись и срок действия токена и передаёт в сервисы заголовки
`x-user-id` и `x-user-role`. Роль `admin` нужна для управления справочниками
(типы блюд, ингредиенты) и смены ролей пользователей.

Bootstrap-админ создаётся при старте `user-service` из `ADMIN_USERNAME` /
`ADMIN_PASSWORD` (по умолчанию `admin` / `admin123`).

## Соглашения

- **Формат данных** — `camelCase` в JSON, `snake_case` в колонках БД.
- **Списки** возвращают конверт `{ items, total, page, limit }`; шаги рецепта —
  обычный массив.
- **Ошибки** — `{ error, details? }`, где `details` содержит ошибки валидации
  по полям. Основные коды:

| Код | Когда |
|---|---|
| `400` | невалидное тело/параметры, нарушение внешнего ключа |
| `401` | нет токена, токен просрочен или пользователь удалён |
| `403` | действие доступно только владельцу или админу |
| `404` | сущность не найдена |
| `409` | конфликт уникальности (например, занятый `username`) |
| `502` | сервис-зависимость недоступен |

- **Фильтры поиска**: `search`, `difficulty`, `dishTypeIds`, `ingredientIds`,
  `page`, `limit`.

## Swagger UI

Приложение отдаёт документацию само:

- интерактивная страница — `http://<host>/api-docs/`;
- спецификация в JSON — `http://<host>/openapi.json`;
- исходник — [docs/openapi.yaml](https://github.com/KlimVladMaks/recipe-hub/blob/main/docs/openapi.yaml).

В Swagger UI включены `persistAuthorization` (токен сохраняется между запросами),
`displayRequestDuration` и «Try it out», а у ключевых схем есть примеры — можно
проверить API руками без Postman.

## Спецификация

Ниже — спецификация, отрендеренная Redoc. Она собирается из того же
`docs/openapi.yaml`, что и Swagger UI, поэтому расхождений между ними нет.

<redoc spec-url="../openapi.yaml"></redoc>
<script src="https://cdn.jsdelivr.net/npm/redoc@2/bundles/redoc.standalone.js"></script>

Если Redoc не загрузился (например, CDN недоступен), откройте
[исходную спецификацию](openapi.yaml) или Swagger UI после локального запуска.

## Postman

Готовый сценарий проверки API с примерами запросов и проверками ответов описан
в разделе [Postman](postman.md).
