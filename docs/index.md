# RecipeHub

RecipeHub — учебный сервис для обмена рецептами и кулинарных блогов, разработанный
в рамках дисциплины «Бэкенд-разработка» (ИТМО, направление «Прикладная информатика»).
Приложение состоит из трёх микросервисов на Node.js + TypeScript, которые работают
за общим API-шлюзом.

!!! info "Об этой документации"
    Сайт собирается из каталога `docs/` того же репозитория с помощью MkDocs
    (тема Material) и публикуется на GitHub Pages. Спецификация API ведётся в
    `docs/openapi.yaml` и одновременно отдаётся Swagger UI из самого приложения.

## Возможности

- Регистрация и вход по JWT, смена пароля, роли `user` / `admin`.
- Личный кабинет: собственные рецепты (включая черновики) и сохранённые рецепты.
- Поиск рецептов с фильтрацией по типу блюда, сложности и ингредиентам.
- Страница рецепта: медиа, пошаговые инструкции с медиа.
- Социальные функции: рейтинги, комментарии, лайки комментариев, подписки
  на кулинаров и персональная лента.

## Технологии

| Слой | Технологии |
|---|---|
| Сервисы | Node.js 20, TypeScript, Express 5, Zod |
| Данные | PostgreSQL 18, Prisma 7 (driver adapter `pg`) |
| Обмен событиями | RabbitMQ 4 (topic exchange) |
| Инфраструктура | Docker Compose, Kubernetes (Yandex Managed), Terraform, Ansible |
| Наблюдаемость | Prometheus, Grafana, Loki, Promtail, cAdvisor |
| Тестирование | `node:test` + `tsx` (E2E), Postman + Newman |
| CI/CD | GitHub Actions |

## Разделы документации

- [Архитектура](architecture.md) — сервисы, потоки данных, взаимодействие.
- [Быстрый старт](getting-started.md) — запуск локального стека за пару минут.
- [API](api.md) — аутентификация, соглашения, Swagger UI и OpenAPI.
- [Postman](postman.md) — коллекция, окружения и запуск сценария.
- [Тестирование](testing.md) — E2E-тесты и проверки в CI.
- [Развёртывание](deployment.md) — облачный стенд, Terraform и CI/CD.
- [Технический дизайн](cloud/technical-design.md) — обоснование облачной
  архитектуры (ДЗ7).

## Быстрые ссылки

- Репозиторий: <https://github.com/KlimVladMaks/recipe-hub>
- OpenAPI-спецификация: [docs/openapi.yaml](https://github.com/KlimVladMaks/recipe-hub/blob/main/docs/openapi.yaml)
- Swagger UI после запуска: <http://localhost:3000/api-docs/>
- Postman-коллекция: [tests/postman](https://github.com/KlimVladMaks/recipe-hub/tree/main/tests/postman)
