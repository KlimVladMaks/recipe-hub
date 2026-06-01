# Заметки

## Docker

```
# Список запущенных сервисов
docker compose ps

# Запуск в фоновом режиме 
docker compose up -d

# Запуск с пересборкой образов
docker compose up -d --build

# Остановка и удаление контейнеров (тома сохраняются)
docker compose down

# Остановить и удалить контейнер вместе с томами
docker compose down -v

# Посмотреть существующие тома
docker volume ls

# Удалить неиспользуемые тома
docker volume prune

# Удалить все тома
docker volume rm $(docker volume ls -q)

# Посмотреть все логи
docker compose logs

# Посмотреть логи конкретного сервиса
docker compose logs <название_сервиса>
```
