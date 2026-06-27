# План перехода с монолита на микросервисную архитектуру

## Текущее состояние

### ✅ Уже реализовано

**User Service** (`services/user/`):
- Prisma schema: `User`, `Subscription` (без `Recipe` и др.)
- Auth: регистрация, логин, смена пароля
- User CRUD: получение/обновление/удаление пользователей, смена роли
- Subscription: подписки/подписчики, isSubscribed, subscribe/unsubscribe
- **Проблема**: `getFeed` в `subscription.service.ts` обращается к `prisma.recipe` — этой таблицы нет в user-db

**Recipe Service** (`services/recipe/`):
- Prisma schema: все модели, связанные с рецептами (кроме `User`)
- Directory: CRUD для dish-types и ingredients
- Recipe service: `getRecipes`, `getUserRecipes`, `getUserSavedRecipes`, `addRecipe`, `getRecipe`, `updateRecipe`, `deleteRecipe`, рейтинги, сохранение рецептов
- **Проблема**: нет контроллеров и роутов для рецептов, шагов, комментариев
- **Проблема**: нет `user.schemas.ts`, хотя он импортируется

**API Gateway** (`services/api-gateway/`):
- Прокси для `/recipes`, `/dish-types`, `/ingredients`, `/users/me/recipes`, `/users/me/saved-recipes`, `/users/:userId/recipes`, `/users/:userId/saved-recipes`
- Прокси для `/auth`, `/users`
- JWT-проверка, проброс `x-user-id` и `x-user-role` заголовков
- **Проблема**: нет прокси для комментариев, шагов, рейтингов, сохранения рецептов

**Docker Compose** (`docker-compose.yml`):
- user-db (postgres, порт 5433)
- recipe-db (postgres, порт 5434)
- user-service, recipe-service, api-gateway
- Prisma Studio для обоих сервисов

---

## Что нужно сделать

### 1. Recipe Service: добавить недостающие файлы и эндпоинты

#### 1.1 Создать `services/recipe/src/schemas/user.schemas.ts`
Скопировать из `services/user/src/schemas/user.schemas.ts` (нужен для `RecipeReadSchema` и `CommentReadSchema`)

#### 1.2 Создать `services/recipe/src/controllers/recipe.controller.ts`
Перенести из `legacy-monolith/src/controllers/recipe.controller.ts`:
- `getCurrentUserRecipes`
- `getCurrentUserSavedRecipes`
- `getUserRecipes`
- `getUserSavedRecipes`
- `getRecipes`
- `addRecipe`
- `getRecipe`
- `updateRecipe`
- `deleteRecipe`
- `getRecipeRating`
- `putRecipeRating`
- `deleteRecipeRating`
- `isRecipeSaved`
- `saveRecipe`
- `unsaveRecipe`

#### 1.3 Создать `services/recipe/src/controllers/comment.controller.ts`
Перенести из `legacy-monolith/src/controllers/comment.controller.ts`:
- `getComments`
- `addComment`
- `getComment`
- `updateComment`
- `deleteComment`
- `isCommentLiked`
- `likeComment`
- `unlikeComment`

#### 1.4 Создать `services/recipe/src/controllers/step.controller.ts`
Перенести из `legacy-monolith/src/controllers/step.controller.ts`:
- `getSteps`
- `addStep`
- `getStep`
- `updateStep`
- `deleteStep`

#### 1.5 Создать `services/recipe/src/services/comment.service.ts`
Перенести из `legacy-monolith/src/services/comment.service.ts`:
- `isUserCommentAuthor`
- `isCorrectCommentId`
- `getComments`
- `createComment`
- `getComment`
- `updateComment`
- `deleteComment`
- `isCommentLiked`
- `likeComment`
- `unlikeComment`

#### 1.6 Создать `services/recipe/src/services/step.service.ts`
Перенести из `legacy-monolith/src/services/step.service.ts`:
- `getSteps`
- `addStep`
- `getStep`
- `updateStep`
- `deleteStep`
- `isCorrectStepId`

#### 1.7 Обновить `services/recipe/src/routes/recipe.routes.ts`
Раскомментировать и добавить все эндпоинты для рецептов:
- `GET /recipes` — поиск рецептов с фильтрацией
- `POST /recipes` — создание рецепта
- `GET /recipes/:recipeId` — получение рецепта
- `PATCH /recipes/:recipeId` — обновление рецепта (только автор)
- `DELETE /recipes/:recipeId` — удаление рецепта (автор или админ)
- `GET /recipes/:recipeId/rating` — получить рейтинг
- `PUT /recipes/:recipeId/rating` — поставить оценку
- `DELETE /recipes/:recipeId/rating` — удалить оценку
- `GET /recipes/:recipeId/save` — проверка сохранения
- `POST /recipes/:recipeId/save` — сохранить рецепт
- `DELETE /recipes/:recipeId/save` — удалить из сохранённых
- `GET /users/me/recipes` — рецепты текущего пользователя
- `GET /users/me/saved-recipes` — сохранённые рецепты
- `GET /users/:userId/recipes` — рецепты пользователя
- `GET /users/:userId/saved-recipes` — сохранённые рецепты пользователя

#### 1.8 Создать `services/recipe/src/routes/comment.routes.ts`
Все эндпоинты для комментариев:
- `GET /recipes/:recipeId/comments`
- `POST /recipes/:recipeId/comments`
- `GET /recipes/:recipeId/comments/:commentId`
- `PATCH /recipes/:recipeId/comments/:commentId`
- `DELETE /recipes/:recipeId/comments/:commentId`
- `GET /recipes/:recipeId/comments/:commentId/like`
- `POST /recipes/:recipeId/comments/:commentId/like`
- `DELETE /recipes/:recipeId/comments/:commentId/like`

#### 1.9 Создать `services/recipe/src/routes/step.routes.ts`
Все эндпоинты для шагов:
- `GET /recipes/:recipeId/steps`
- `POST /recipes/:recipeId/steps`
- `GET /recipes/:recipeId/steps/:stepId`
- `PATCH /recipes/:recipeId/steps/:stepId`
- `DELETE /recipes/:recipeId/steps/:stepId`

#### 1.10 Обновить `services/recipe/src/routes/index.ts`
Подключить `commentRouter` и `stepRouter`

#### 1.11 Обновить `services/recipe/src/middleware/auth.middleware.ts`
Добавить middleware для проверки автора рецепта/комментария (используя `x-user-id` заголовок):
- `isRecipeAuthor`
- `isRecipeAuthorOrAdmin`
- `isCommentAuthor`
- `isCommentAuthorOrAdmin`
- `isCorrectCommentId` (проверка, что комментарий принадлежит рецепту)
- `isCorrectStepId` (проверка, что шаг принадлежит рецепту)

### 2. User Service: исправить ленту подписок

#### 2.1 Исправить `services/user/src/services/subscription.service.ts`
Убрать обращение к `prisma.recipe` в `getFeed`. Вместо этого:
- Получать ID авторов, на которых подписан пользователь
- Возвращать список authorIds
- **ИЛИ** сделать HTTP-запрос к recipe-service по внутреннему эндпоинту

**Решение**: Перенести `getFeed` в recipe-service, т.к. он работает с рецептами. В user-service оставить только метод `getSubscribedAuthorIds`, который возвращает список ID авторов.

#### 2.2 Обновить `services/user/src/controllers/subscription.controller.ts`
Убрать `getFeed` (перенесён в recipe-service)

#### 2.3 Обновить `services/user/src/routes/subscription.routes.ts`
Убрать маршрут `/users/me/feed`

### 3. Recipe Service: добавить feed

#### 3.1 Добавить `services/recipe/src/controllers/feed.controller.ts`
Новый контроллер для ленты подписок:
- `getFeed` — получает `authorIds` из query-параметров (переданных api-gateway) и возвращает рецепты

#### 3.2 Добавить `services/recipe/src/services/feed.service.ts`
Новый сервис для ленты подписок:
- `getFeed(authorIds, page, limit, search, dishTypeIds, ingredientIds, difficulty)`

#### 3.3 Добавить `services/recipe/src/routes/feed.routes.ts`
- `GET /feed` — принимает `authorIds` как query-параметр (через api-gateway)

### 4. API Gateway: добавить недостающие прокси

#### 4.1 Обновить `services/api-gateway/src/routes/index.ts`
Добавить прокси для:
- `GET /recipes/:recipeId/comments`
- `POST /recipes/:recipeId/comments`
- `GET/PATCH/DELETE /recipes/:recipeId/comments/:commentId`
- `GET/POST/DELETE /recipes/:recipeId/comments/:commentId/like`
- `GET/POST/PATCH/DELETE /recipes/:recipeId/steps`
- `GET/PATCH/DELETE /recipes/:recipeId/steps/:stepId`
- `GET/PUT/DELETE /recipes/:recipeId/rating`
- `GET/POST/DELETE /recipes/:recipeId/save`
- `GET /users/me/feed` — прокси на recipe-service с добавлением `authorIds`

### 5. RabbitMQ: межсервисное взаимодействие

#### 5.1 Добавить RabbitMQ в docker-compose.yml
```yaml
rabbitmq:
  image: rabbitmq:4.0-management-alpine
  container_name: recipe-hub-rabbitmq
  ports:
    - "5672:5672"
    - "15672:15672"
```

#### 5.2 User Service: отправка события `user.created`
При регистрации пользователя отправлять событие в RabbitMQ с данными пользователя (id, username, firstName, lastName, about, role).

#### 5.3 Recipe Service: получение события `user.created`
Создать consumer, который при получении события `user.created` сохраняет пользователя в локальную таблицу `User` recipe-db.

**Важно**: В Prisma schema recipe-service нет модели `User`. Нужно её добавить (только для синхронизации, без пароля).

#### 5.4 Обновить Prisma schema recipe-service
Добавить модель `User`:
```prisma
model User {
  id            Int       @id
  username      String    @db.VarChar(255)
  firstName     String    @map("first_name") @db.VarChar(255)
  lastName      String    @map("last_name") @db.VarChar(255)
  about         String?   @db.Text
  role          Role      @default(user)
  createdAt     DateTime  @map("created_at") @default(now())
  updatedAt     DateTime  @map("updated_at") @updatedAt

  @@map("users")
}
```

#### 5.5 Установить amqplib в оба сервиса
```bash
npm i amqplib
npm i -D @types/amqplib
```

### 6. Dockerfile: обновить для Prisma generate

#### 6.1 Обновить Dockerfile для user-service и recipe-service
Добавить шаги для генерации Prisma Client перед запуском:
```dockerfile
COPY prisma ./prisma/
RUN npx prisma generate
```

### 7. .env файлы

#### 7.1 Создать `services/user/.env`
```
PORT=3001
DATABASE_URL=postgresql://user:password@user-db:5432/user_db
JWT_SECRET=super-secret-jwt-key
```

#### 7.2 Создать `services/recipe/.env`
```
PORT=3002
DATABASE_URL=postgresql://user:password@recipe-db:5432/recipe_db
JWT_SECRET=super-secret-jwt-key
X_USER_ID=x-user-id
X_USER_ROLE=x-user-role
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

#### 7.3 Создать `services/api-gateway/.env`
```
PORT=3000
USER_SERVICE_URL=http://user-service:3001
RECIPE_SERVICE_URL=http://recipe-service:3002
JWT_SECRET=super-secret-jwt-key
X_USER_ID=x-user-id
X_USER_ROLE=x-user-role
```

### 8. Обновить docker-compose.yml

#### 8.1 Добавить RabbitMQ сервис
#### 8.2 Обновить depends_on для recipe-service (добавить rabbitmq)
#### 8.3 Обновить depends_on для user-service (добавить rabbitmq)

---

## Архитектура взаимодействия

```mermaid
flowchart TB
    Client[Client] -->|HTTP| APIGateway[API Gateway :3000]
    
    APIGateway -->|/auth/* /users/*| UserService[User Service :3001]
    APIGateway -->|/recipes/* /dish-types/* /ingredients/* /feed| RecipeService[Recipe Service :3002]
    
    UserService -->|user.created event| RabbitMQ[(RabbitMQ)]
    RecipeService -->|consumes user.created| RabbitMQ
    
    UserService --> UserDB[(User DB :5433)]
    RecipeService --> RecipeDB[(Recipe DB :5434)]
    
    subgraph "User Service"
        US_Auth[Auth: register/login/password]
        US_User[User CRUD]
        US_Sub[Subscriptions]
    end
    
    subgraph "Recipe Service"
        RS_Recipe[Recipe CRUD]
        RS_Step[Steps]
        RS_Comment[Comments + Likes]
        RS_Rating[Ratings]
        RS_Saved[Saved Recipes]
        RS_Directory[Dish Types / Ingredients]
        RS_Feed[Feed]
    end
```

## Порядок выполнения

1. Recipe Service: user.schemas.ts
2. Recipe Service: comment.service.ts + step.service.ts
3. Recipe Service: recipe.controller.ts + comment.controller.ts + step.controller.ts
4. Recipe Service: recipe.routes.ts + comment.routes.ts + step.routes.ts
5. Recipe Service: обновить index.ts (роуты)
6. Recipe Service: обновить auth.middleware.ts (проверки авторов)
7. User Service: исправить feed (перенести в recipe-service)
8. Recipe Service: feed.controller.ts + feed.service.ts + feed.routes.ts
9. API Gateway: добавить прокси для комментариев, шагов, рейтингов, feed
10. RabbitMQ: добавить в docker-compose
11. User Service: добавить отправку событий при регистрации
12. Recipe Service: добавить модель User в Prisma + consumer
13. Dockerfile: обновить для Prisma generate
14. .env файлы: создать для всех сервисов
15. docker-compose.yml: финальные обновления