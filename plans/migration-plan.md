# План миграции: Монолит → Микросервисная архитектура

## Общая архитектура

```
┌─────────────────────────────────────────────────────────┐
│                     API Gateway (:3000)                   │
│  - JWT-аутентификация                                    │
│  - Проксирование запросов к сервисам                     │
│  - Композиция для feed                                   │
└──────┬────────────────────────────┬──────────────────────┘
       │                            │
       ▼                            ▼
┌──────────────┐           ┌──────────────────┐
│ User Service │◄─HTTP────►│  Recipe Service   │
│   (:3001)    │           │     (:3002)       │
│              │◄─Rabbit──►│                   │
│ - users      │           │ - recipes         │
│ - subs       │           │ - comments        │
│              │           │ - steps           │
│              │           │ - ratings         │
│              │           │ - saved_recipes   │
│              │           │ - dish_types      │
│              │           │ - ingredients     │
└──────┬───────┘           └────────┬──────────┘
       │                            │
       ▼                            ▼
┌──────────────┐           ┌──────────────────┐
│  user-db     │           │   recipe-db      │
│  (:5433)     │           │   (:5434)        │
└──────────────┘           └──────────────────┘

       ┌──────────────────┐
       │    RabbitMQ      │
       │  user-exchange   │
       │  events:         │
       │  - user.created  │
       │  - user.deleted  │
       └──────────────────┘
```

## Межсервисное взаимодействие

### 1. HTTP (внутренние эндпоинты)

**User Service →暴露 внутренние эндпоинты:**

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/internal/users/:userId` | Получить данные пользователя по ID |
| GET | `/internal/users/:userId/is-admin` | Проверить, является ли пользователь админом |
| GET | `/internal/users/batch?ids=1,2,3` | Получить нескольких пользователей |

**Recipe Service → вызывает user-service** для:
- Получения данных автора рецепта/комментария
- Проверки роли администратора

### 2. RabbitMQ (асинхронные события)

**User Service → отправляет события:**
- `user.created` — при регистрации нового пользователя
- `user.deleted` — при удалении пользователя

**Recipe Service → потребляет события:**
- `user.deleted` — удаляет все рецепты, комментарии, рейтинги, сохранения пользователя

---

## Поэтапный план реализации

### Этап 1: User Service — добавить недостающие эндпоинты

#### 1.1 User CRUD (user.routes.ts, UserController, UserService)

**Маршруты:**
| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/users` | auth + admin | Список пользователей (пагинация) |
| GET | `/users/me` | auth | Текущий пользователь |
| PATCH | `/users/me` | auth | Обновить свой профиль |
| DELETE | `/users/me` | auth | Удалить свой аккаунт |
| GET | `/users/:userId` | auth | Получить пользователя по ID |
| DELETE | `/users/:userId` | auth + admin | Удалить пользователя (админ) |
| PATCH | `/users/:userId/role` | auth + admin | Изменить роль пользователя |

**Схемы (user.schemas.ts):**
- `UserUpdateSchema` — username?, firstName?, lastName?, about?
- `UserRoleUpdateSchema` — role

**Сервис (UserService):**
- `getUsers(page, limit)` — список с пагинацией
- `getUser(userId)` — получить по ID
- `updateUser(userId, data)` — обновить профиль
- `deleteUser(userId)` — удалить пользователя
- `updateUserRole(userId, data)` — изменить роль

#### 1.2 Subscription CRUD (subscription.routes.ts, SubscriptionController, SubscriptionService)

**Маршруты:**
| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/users/me/subscriptions` | auth | Мои подписки |
| GET | `/users/me/subscribers` | auth | Мои подписчики |
| GET | `/users/me/feed` | auth | Лента подписок (композиция в gateway) |
| GET | `/users/:userId/subscribe` | auth | Проверить подписку |
| POST | `/users/:userId/subscribe` | auth | Подписаться |
| DELETE | `/users/:userId/subscribe` | auth | Отписаться |
| GET | `/users/:userId/subscriptions` | auth | Подписки пользователя |
| GET | `/users/:userId/subscribers` | auth | Подписчики пользователя |

**Схемы (subscription.schema.ts):**
- `IsSubscribedToUserReadSchema` — { isSubscribed: boolean }

**Сервис (SubscriptionService):**
- `getSubscriptions(userId, page, limit)` — список подписок
- `getSubscribers(userId, page, limit)` — список подписчиков
- `isSubscribed(currentUserId, userId)` — проверка подписки
- `subscribe(currentUserId, userId)` — подписаться
- `unsubscribe(currentUserId, userId)` — отписаться

#### 1.3 Внутренние эндпоинты (internal.routes.ts)

**Маршруты (без auth, только для внутреннего использования):**
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/internal/users/:userId` | Получить пользователя по ID |
| GET | `/internal/users/:userId/is-admin` | Проверить роль администратора |
| GET | `/internal/users/batch?ids=1,2,3` | Получить нескольких пользователей |

#### 1.4 RabbitMQ — отправка событий

- Установить пакет `amqplib`
- Создать `src/services/eventBus.ts`:
  - `connect()` — подключение к RabbitMQ
  - `publishUserCreated(user)` — отправка события
  - `publishUserDeleted(userId)` — отправка события
- Вызывать при регистрации и удалении пользователя

---

### Этап 2: Recipe Service — добавить недостающие эндпоинты

#### 2.1 Recipe CRUD (recipe.routes.ts, RecipeController, RecipeService)

**Маршруты:**
| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/recipes` | auth | Список рецептов с фильтрацией |
| POST | `/recipes` | auth | Создать рецепт |
| GET | `/recipes/:recipeId` | auth | Получить рецепт |
| PATCH | `/recipes/:recipeId` | auth + author | Обновить рецепт |
| DELETE | `/recipes/:recipeId` | auth + author/admin | Удалить рецепт |
| GET | `/users/me/recipes` | auth | Мои рецепты |
| GET | `/users/:userId/recipes` | auth | Рецепты пользователя |
| GET | `/users/me/saved-recipes` | auth | Мои сохранённые |
| GET | `/users/:userId/saved-recipes` | auth | Сохранённые пользователя |
| GET | `/recipes/:recipeId/rating` | auth | Получить рейтинг |
| PUT | `/recipes/:recipeId/rating` | auth | Поставить оценку |
| DELETE | `/recipes/:recipeId/rating` | auth | Удалить оценку |
| GET | `/recipes/:recipeId/save` | auth | Проверить сохранение |
| POST | `/recipes/:recipeId/save` | auth | Сохранить рецепт |
| DELETE | `/recipes/:recipeId/save` | auth | Удалить из сохранённых |

**Схемы (recipe.schemas.ts):**
- `RecipeReadSchema` — полная информация о рецепте (с автором)
- `RecipeReadListSchema` — массив рецептов
- `RecipeCreateSchema` — title, dishTypeIds?, ingredientIds?, description?, media?, difficulty?, isPublished
- `RecipeUpdateSchema` — все поля опционально
- `RecipeRatingReadSchema` — { avg_rating, rating_by_user }
- `RecipeRatingPutSchema` — { rating: 1-10 }
- `IsRecipeSavedReadSchema` — { isSaved: boolean }

**Сервис (RecipeService):**
- Полная копия логики из legacy-monolith/src/services/recipe.service.ts
- Вместо `prisma.user.findUnique` — HTTP-запрос к user-service
- Вместо `author: true` в include — запрос к user-service за данными автора

#### 2.2 Comment CRUD (comment.routes.ts, CommentController, CommentService)

**Маршруты:**
| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/recipes/:recipeId/comments` | auth | Список комментариев |
| POST | `/recipes/:recipeId/comments` | auth | Создать комментарий |
| GET | `/recipes/:recipeId/comments/:commentId` | auth | Получить комментарий |
| PATCH | `/recipes/:recipeId/comments/:commentId` | auth + author | Обновить |
| DELETE | `/recipes/:recipeId/comments/:commentId` | auth + author/admin | Удалить |
| GET | `/recipes/:recipeId/comments/:commentId/like` | auth | Проверить лайк |
| POST | `/recipes/:recipeId/comments/:commentId/like` | auth | Поставить лайк |
| DELETE | `/recipes/:recipeId/comments/:commentId/like` | auth | Убрать лайк |

**Схемы (comment.schemas.ts):**
- `CommentReadSchema` — { id, user, text, createdAt, updatedAt }
- `CommentCreateSchema` — { text }
- `CommentUpdateSchema` — { text }
- `IsCommentLikedReadSchema` — { isLiked: boolean }

**Сервис (CommentService):**
- Полная копия логики из legacy-monolith/src/services/comment.service.ts
- Вместо `user: true` в include — запрос к user-service

#### 2.3 Step CRUD (step.routes.ts, StepController, StepService)

**Маршруты:**
| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/recipes/:recipeId/steps` | auth | Список шагов |
| POST | `/recipes/:recipeId/steps` | auth + author | Создать шаг |
| GET | `/recipes/:recipeId/steps/:stepId` | auth | Получить шаг |
| PATCH | `/recipes/:recipeId/steps/:stepId` | auth + author | Обновить шаг |
| DELETE | `/recipes/:recipeId/steps/:stepId` | auth + author | Удалить шаг |

**Схемы (step.schemas.ts):**
- `StepReadSchema` — { id, number, title, media, description, createdAt, updatedAt }
- `StepCreateSchema` — { number, title, media?, description? }
- `StepUpdateSchema` — все поля опционально

**Сервис (StepService):**
- Полная копия логики из legacy-monolith/src/services/step.service.ts

#### 2.4 HTTP-клиент для user-service

Создать `src/services/userServiceClient.ts`:
- `getUser(userId)` — GET `/internal/users/:userId`
- `isAdmin(userId)` — GET `/internal/users/:userId/is-admin`
- `getUsersBatch(ids)` — GET `/internal/users/batch?ids=...`

#### 2.5 RabbitMQ — потребление событий

- Установить пакет `amqplib`
- Создать `src/services/eventBus.ts`:
  - `connect()` — подключение к RabbitMQ
  - `consumeUserEvents()` — подписка на события user-service
  - При `user.deleted` — удалить все рецепты/комментарии/рейтинги пользователя

---

### Этап 3: API Gateway — обновить маршрутизацию

#### 3.1 Обновить routes/index.ts

Добавить прокси для новых маршрутов:

```typescript
// Recipe Service — новые маршруты
router.use('/recipes/:recipeId/comments', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/recipes/:recipeId/steps', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/recipes/:recipeId/rating', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/recipes/:recipeId/save', authMiddleware, createProxy(config.service_urls.recipe));

// User Service — новые маршруты
router.use('/users/me/subscriptions', authMiddleware, createProxy(config.service_urls.user));
router.use('/users/me/subscribers', authMiddleware, createProxy(config.service_urls.user));
router.use('/users/:userId/subscribe', authMiddleware, createProxy(config.service_urls.user));
router.use('/users/:userId/subscriptions', authMiddleware, createProxy(config.service_urls.user));
router.use('/users/:userId/subscribers', authMiddleware, createProxy(config.service_urls.user));
```

#### 3.2 Композиция для feed (GET /users/me/feed)

Создать `src/routes/feed.ts`:
1. Получить `currentUserId` из заголовка (уже добавлен authMiddleware)
2. Сделать запрос в user-service: `GET /internal/users/:userId/subscriptions?ids-only=true` (или получить список ID через внутренний эндпоинт)
3. Сделать запрос в recipe-service: `GET /internal/recipes/by-authors?authorIds=1,2,3&page=...&limit=...`
4. Вернуть объединённый результат

---

### Этап 4: Docker и инфраструктура

#### 4.1 docker-compose.yml — добавить RabbitMQ

```yaml
rabbitmq:
  image: rabbitmq:4.1-management-alpine
  container_name: recipe-hub-rabbitmq
  ports:
    - "5672:5672"   # AMQP
    - "15672:15672" # Management UI
  environment:
    RABBITMQ_DEFAULT_USER: guest
    RABBITMQ_DEFAULT_PASS: guest
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
    interval: 10s
    timeout: 5s
    retries: 5
```

#### 4.2 Обновить Dockerfile для сервисов

**user-service/Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

**recipe-service/Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

#### 4.3 Обновить .env файлы

**user-service/.env — добавить:**
```
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

**recipe-service/.env — добавить:**
```
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
USER_SERVICE_URL=http://user-service:3001
```

#### 4.4 Обновить package.json для сервисов

**user-service/package.json — добавить:**
```json
"amqplib": "^0.10.0"
```

**recipe-service/package.json — добавить:**
```json
"amqplib": "^0.10.0"
```

---

### Этап 5: Финальная проверка

#### 5.1 Маппинг эндпоинтов

Проверить, что каждый эндпоинт из legacy-monolith имеет соответствие:

| Legacy эндпоинт | Микросервис | Статус |
|----------------|-------------|--------|
| POST /auth/register | user-service | ✅ уже есть |
| POST /auth/login | user-service | ✅ уже есть |
| PATCH /users/me/password | user-service | ✅ уже есть |
| GET /users | user-service | 📝 добавить |
| GET /users/me | user-service | 📝 добавить |
| PATCH /users/me | user-service | 📝 добавить |
| DELETE /users/me | user-service | 📝 добавить |
| GET /users/:userId | user-service | 📝 добавить |
| DELETE /users/:userId | user-service | 📝 добавить |
| PATCH /users/:userId/role | user-service | 📝 добавить |
| GET /users/me/subscriptions | user-service | 📝 добавить |
| GET /users/me/subscribers | user-service | 📝 добавить |
| GET /users/me/feed | api-gateway (compose) | 📝 добавить |
| GET /users/:userId/subscribe | user-service | 📝 добавить |
| POST /users/:userId/subscribe | user-service | 📝 добавить |
| DELETE /users/:userId/subscribe | user-service | 📝 добавить |
| GET /users/:userId/subscriptions | user-service | 📝 добавить |
| GET /users/:userId/subscribers | user-service | 📝 добавить |
| GET /recipes | recipe-service | 📝 добавить |
| POST /recipes | recipe-service | 📝 добавить |
| GET /recipes/:recipeId | recipe-service | 📝 добавить |
| PATCH /recipes/:recipeId | recipe-service | 📝 добавить |
| DELETE /recipes/:recipeId | recipe-service | 📝 добавить |
| GET /users/me/recipes | recipe-service | 📝 добавить |
| GET /users/:userId/recipes | recipe-service | 📝 добавить |
| GET /users/me/saved-recipes | recipe-service | 📝 добавить |
| GET /users/:userId/saved-recipes | recipe-service | 📝 добавить |
| GET /recipes/:recipeId/rating | recipe-service | 📝 добавить |
| PUT /recipes/:recipeId/rating | recipe-service | 📝 добавить |
| DELETE /recipes/:recipeId/rating | recipe-service | 📝 добавить |
| GET /recipes/:recipeId/save | recipe-service | 📝 добавить |
| POST /recipes/:recipeId/save | recipe-service | 📝 добавить |
| DELETE /recipes/:recipeId/save | recipe-service | 📝 добавить |
| GET /recipes/:recipeId/comments | recipe-service | 📝 добавить |
| POST /recipes/:recipeId/comments | recipe-service | 📝 добавить |
| GET /recipes/:recipeId/comments/:commentId | recipe-service | 📝 добавить |
| PATCH /recipes/:recipeId/comments/:commentId | recipe-service | 📝 добавить |
| DELETE /recipes/:recipeId/comments/:commentId | recipe-service | 📝 добавить |
| GET /recipes/:recipeId/comments/:commentId/like | recipe-service | 📝 добавить |
| POST /recipes/:recipeId/comments/:commentId/like | recipe-service | 📝 добавить |
| DELETE /recipes/:recipeId/comments/:commentId/like | recipe-service | 📝 добавить |
| GET /recipes/:recipeId/steps | recipe-service | 📝 добавить |
| POST /recipes/:recipeId/steps | recipe-service | 📝 добавить |
| GET /recipes/:recipeId/steps/:stepId | recipe-service | 📝 добавить |
| PATCH /recipes/:recipeId/steps/:stepId | recipe-service | 📝 добавить |
| DELETE /recipes/:recipeId/steps/:stepId | recipe-service | 📝 добавить |
| GET /dish-types | recipe-service | ✅ уже есть |
| POST /dish-types | recipe-service | ✅ уже есть |
| GET /dish-types/:dishTypeId | recipe-service | ✅ уже есть |
| PATCH /dish-types/:dishTypeId | recipe-service | ✅ уже есть |
| DELETE /dish-types/:dishTypeId | recipe-service | ✅ уже есть |
| GET /ingredients | recipe-service | ✅ уже есть |
| POST /ingredients | recipe-service | ✅ уже есть |
| GET /ingredients/:ingredientId | recipe-service | ✅ уже есть |
| PATCH /ingredients/:ingredientId | recipe-service | ✅ уже есть |
| DELETE /ingredients/:ingredientId | recipe-service | ✅ уже есть |

#### 5.2 Проверка межсервисного взаимодействия

- recipe-service → user-service (HTTP): получение данных пользователя
- recipe-service → user-service (HTTP): проверка роли администратора
- user-service → RabbitMQ → recipe-service: события создания/удаления пользователя

---

## Структура файлов после реализации

```
services/
├── api-gateway/
│   └── src/
│       └── routes/
│           ├── index.ts          # + новые прокси
│           └── feed.ts           # NEW: композиция для feed
├── user/
│   └── src/
│       ├── routes/
│       │   ├── index.ts          # + user, subscription, internal
│       │   ├── auth.routes.ts    # уже есть
│       │   ├── user.routes.ts    # NEW
│       │   ├── subscription.routes.ts  # NEW
│       │   └── internal.routes.ts      # NEW
│       ├── controllers/
│       │   ├── auth.controller.ts      # уже есть
│       │   ├── user.controller.ts      # NEW
│       │   └── subscription.controller.ts  # NEW
│       ├── services/
│       │   ├── auth.service.ts         # уже есть
│       │   ├── user.service.ts         # NEW
│       │   ├── subscription.service.ts # NEW
│       │   └── eventBus.ts             # NEW: RabbitMQ publisher
│       └── schemas/
│           ├── auth.schemas.ts         # уже есть
│           ├── user.schemas.ts         # + UserUpdateSchema, UserRoleUpdateSchema
│           └── subscription.schema.ts  # NEW
├── recipe/
│   └── src/
│       ├── routes/
│       │   ├── index.ts          # + recipe, comment, step routes
│       │   ├── directory.routes.ts    # уже есть
│       │   ├── recipe.routes.ts       # UPDATE: раскомментировать и дополнить
│       │   ├── comment.routes.ts      # NEW
│       │   └── step.routes.ts         # NEW
│       ├── controllers/
│       │   ├── directory.controller.ts    # уже есть
│       │   ├── recipe.controller.ts       # NEW
│       │   ├── comment.controller.ts      # NEW
│       │   └── step.controller.ts         # NEW
│       ├── services/
│       │   ├── directory.service.ts       # уже есть
│       │   ├── recipe.service.ts          # NEW
│       │   ├── comment.service.ts         # NEW
│       │   ├── step.service.ts            # NEW
│       │   ├── userServiceClient.ts       # NEW: HTTP client
│       │   └── eventBus.ts               # NEW: RabbitMQ consumer
│       └── schemas/
│           ├── directory.schemas.ts       # уже есть
│           ├── recipe.schemas.ts          # NEW
│           ├── comment.schemas.ts         # NEW
│           └── step.schemas.ts            # NEW