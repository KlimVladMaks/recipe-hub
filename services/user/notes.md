# Заметки

## Bootstrap-администратор

Зарегистрировать админа через API нельзя: регистрация всегда создаёт роль `user`,
а смена роли требует существующего админа. Поэтому `user-service` при старте
идемпотентно создаёт (или повышает) администратора из переменных окружения:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

Если переменные не заданы — bootstrap отключён. После их изменения перезапустите
сервис (`docker compose up -d --build user-service`). Логин: `POST /api/auth/login`.

## Ручной запуск приложения

```
npm run start
```

## Prisma

```
# Миграции
npx prisma migrate dev --name <название_миграции>
npx prisma migrate dev

# Создание/обновление клиента Prisma
# (нужно вызывать после каждого изменения `prisma/schema.prisma`)
npx prisma generate

# Запуск Prisma Studio
npx prisma studio

# Сброс БД и повторное применение миграций
npx prisma migrate reset

# Быстрая синхронизация текущей схемы Prisma c БД (без миграции)
npx prisma db push
```
