# План миграции с монолита на микросервисы

## Текущее состояние

### Монолит (legacy-monolith)
- Полный функционал: auth, users, recipes, comments, subscriptions, steps, directory
- База данных: PostgreSQL
- Все сервисы в одном приложении

### Микросервисы (services)
- `user-service` (порт 3001): User + Subscription (база user_db)
- `recipe-service` (порт 3002): Recipe + все связи (база recipe_db)
- `api-gateway` (порт 3000): проксирование запросов

---

## Задача: полная миграция функционала

### 1. User Service - полная реализация

#### Эндпоинты (из legacy-monolith):
- `POST /auth/register` - регистрация
- `POST /auth/login` - вход
- `PATCH /users/me/password` - смена пароля
- `GET /users` - список пользователей (admin only)
- `GET /users/me` - текущий пользователь
- `PATCH /users/me` - обновление профиля
- `DELETE /users/me` - удаление профиля
- `GET /users/:userId` - пользователь по ID
- `DELETE /users/:userId` - удаление (admin only)
- `PATCH /users/:userId/role` - смена роли (admin only)
- `GET /users/me/subscriptions` - мои подписки
- `GET /users/me/subscribers` - мои подписчики
- `GET /users/me/feed` - лента (подписки)
- `GET /users/:userId/subscribe` - статус подписки
- `POST /users/:userId/subscribe` - подписаться
- `DELETE /users/:userId/subscribe` - отписаться
- `GET /users/:userId/subscriptions` - подписки пользователя
- `GET /users/:userId/subscribers` - подписчики пользователя

#### Что нужно сделать:
- Создать папки: `controllers`, `routes`, `schemas`, `services`, `middleware`
- Перенести схемы валидации (auth, user, subscription)
- Перенести контроллеры (auth, user, subscription)
- Перенести сервисы (auth, user, subscription)
- Перенести middleware (auth)
- Настроить routes
- Протестировать

---

### 2. Recipe Service - полная реализация

#### Эндпоинты (из legacy-monolith):
- `GET /users/me/recipes` - мои рецепты
- `GET /users/me/saved-recipes` - сохранённые рецепты
- `GET /users/:userId/recipes` - рецепты пользователя
- `GET /users/:userId/saved-recipes` - сохранённые рецепты пользователя
- `GET /recipes` - все опубликованные рецепты (с фильтрацией)
- `POST /recipes` - создание рецепта
- `GET /recipes/:recipeId` - рецепт по ID
- `PATCH /recipes/:recipeId` - обновление рецепта (автор)
- `DELETE /recipes/:recipeId` - удаление (автор или admin)
- `GET /recipes/:recipeId/rating` - рейтинг рецепта
- `PUT /recipes/:recipeId/rating` - поставить оценку
- `DELETE /recipes/:recipeId/rating` - удалить оценку
- `GET /recipes/:recipeId/save` - сохранён ли рецепт
- `POST /recipes/:recipeId/save` - сохранить рецепт
- `DELETE /recipes/:recipeId/save` - удалить из сохранённых

#### Эндпоинты комментариев:
- `GET /recipes/:recipeId/comments` - комментарии к рецепту
- `POST /recipes/:recipeId/comments` - добавить комментарий
- `GET /recipes/:recipeId/comments/:commentId` - комментарий по ID
- `PATCH /recipes/:recipeId/comments/:commentId` - обновить комментарий
- `DELETE /recipes/:recipeId/comments/:commentId` - удалить комментарий
- `GET /recipes/:recipeId/comments/:commentId/like` - лайкнут ли комментарий
- `POST /recipes/:recipeId/comments/:commentId/like` - лайкнуть
- `DELETE /recipes/:recipeId/comments/:commentId/like` - убрать лайк

#### Эндпоинты шагов:
- `GET /recipes/:recipeId/steps` - шаги рецепта
- `POST /recipes/:recipeId/steps` - добавить шаг
- `GET /recipes/:recipeId/steps/:stepId` - шаг по ID
- `PATCH /recipes/:recipeId/steps/:stepId` - обновить шаг
- `DELETE /recipes/:recipeId/steps/:stepId` - удалить шаг

#### Эндпоинты справочников:
- `GET /dish-types` - типы блюд
- `POST /dish-types` - создать тип блюда (admin)
- `GET /dish-types/:dishTypeId` - тип блюда по ID
- `PATCH /dish-types/:dishTypeId` - обновить тип блюда (admin)
- `DELETE /dish-types/:dishTypeId` - удалить тип блюда (admin)
- `GET /ingredients` - ингредиенты
- `POST /ingredients` - создать ингредиент (admin)
- `GET /ingredients/:ingredientId` - ингредиент по ID
- `PATCH /ingredients/:ingredientId` - обновить ингредиент (admin)
- `DELETE /ingredients/:ingredientId` - удалить ингредиент (admin)

#### Что нужно сделать:
- Создать папки: `controllers`, `routes`, `schemas`, `services`, `middleware`
- Создать схемы (recipe, comment, step, directory)
- Создать контроллеры (recipe, comment, step, directory)
- Создать сервисы (recipe, comment, step, directory)
- Создать middleware (auth, isRecipeAuthor, isCommentAuthor)
- Настроить routes
- Протестировать

---

### 3. API Gateway - настройка маршрутизации

#### Проблема:
Сейчас api-gateway не настроен (пустой routes).

#### Решение:
- Настроить проксирование запросов на user-service и recipe-service
- Использовать `http-proxy-middleware`
- Передавать JWT-токен из заголовка Authorization
- Обрабатывать ошибки проксирования

---

### 4. Docker & Docker Compose

#### Обновления:
- Добавить RabbitMQ в docker-compose.yml (для асинхронных событий)
- Настроить сети между сервисами
- Добавить healthchecks
- Проверить зависимости

---

## Архитектура взаимодействия

```
┌─────────────────┐
│   API Gateway   │ (port 3000)
│  (nginx/Express)│
└────────┬────────┘
         │
         ├─────────────────────┬─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  User Service   │  │ Recipe Service  │  │   RabbitMQ      │
│   (port 3001)   │  │  (port 3002)    │  │   (optional)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Пошаговый план реализации

### Этап 1: User Service (приоритет 1)
1. Создать структуру папок (controllers, routes, schemas, services, middleware)
2. Перенести схемы валидации (auth, user, subscription)
3. Перенести middleware (auth)
4. Перенести сервисы (auth, user, subscription)
5. Перенести контроллеры (auth, user, subscription)
6. Настроить routes
7. Протестировать локально

### Этап 2: Recipe Service (приоритет 2)
1. Создать структуру папок
2. Перенести схемы (recipe, comment, step, directory)
3. Перенести middleware (auth, isRecipeAuthor, isCommentAuthor)
4. Перенести сервисы (recipe, comment, step, directory)
5. Перенести контроллеры (recipe, comment, step, directory)
6. Настроить routes
7. Протестировать локально

### Этап 3: API Gateway (приоритет 3)
1. Настроить проксирование запросов
2. Добавить middleware для передачи JWT
3. Обработать ошибки проксирования

### Этап 4: Docker & Docker Compose (приоритет 4)
1. Обновить docker-compose.yml
2. Добавить RabbitMQ (опционально для начала)
3. Проверить запуск всех сервисов

### Этап 5: Тестирование (приоритет 5)
1. Тестировать каждый эндпоинт
2. Проверить межсервисное взаимодействие
3. Проверить обработку ошибок

---

## Примечания

- Все сервисы используют PostgreSQL, но разные базы данных
- User Service отвечает за пользователей и подписки
- Recipe Service отвечает за рецепты, комментарии, шаги, справочники
- API Gateway - точка входа, проксирует запросы
- JWT токен передаётся через заголовок Authorization
