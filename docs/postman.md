# Postman

Коллекция RecipeHub — это одновременно E2E-проверка и документация API: она
показывает реальные запросы с примерами тел, проверками ответов и описаниями
шагов. Одна и та же коллекция работает локально и в облаке, потому что адрес
стенда вынесен в переменную `baseUrl`.

## Файлы

| Файл | Назначение |
|---|---|
| [recipe-hub.postman_collection.json](https://github.com/KlimVladMaks/recipe-hub/blob/main/tests/postman/recipe-hub.postman_collection.json) | 52 запроса, 4 папки, сквозной сценарий с очисткой |
| [local.postman_environment.json](https://github.com/KlimVladMaks/recipe-hub/blob/main/tests/postman/environments/local.postman_environment.json) | локальный стенд: `http://localhost:3000/api` |
| [cloud.postman_environment.json](https://github.com/KlimVladMaks/recipe-hub/blob/main/tests/postman/environments/cloud.postman_environment.json) | шаблон для стенда в Yandex Cloud |
| [README коллекции](https://github.com/KlimVladMaks/recipe-hub/blob/main/tests/postman/README.md) | подробные инструкции и разбор сценария |

## Что покрывает сценарий

| Папка | Запросов | Содержание |
|---|---|---|
| 1. Health | 3 | доступность шлюза и обоих сервисов через `/api/*-health` |
| 2. Справочники | 5 | вход bootstrap-админа, создание типа блюда и ингредиента, поиск |
| 3. Основной сценарий | 30 | регистрация автора и подписчика → два рецепта с медиа и шагами → фильтры → рейтинг → комментарий и лайки → избранное → подписка → лента |
| 4. Очистка | 14 | удаление созданного, проверка `404` и `401` для удалённых пользователей |

Сценарий самодостаточен: имена генерируются в pre-request скриптах, а все
созданные сущности удаляются в последней папке. После прогона база остаётся
чистой, поэтому коллекцию можно запускать повторно и на общем стенде.

## Запуск локально

```bash
docker compose up -d --build
cd tests
npm install
npm run test:postman
```

Без окружения коллекция использует `http://localhost:3000/api` — это значение
задано и в коллекции, и в `local`-окружении.

## Запуск против облака

```bash
# подставь IP балансировщика из вывода deploy-cloud.yml
npx newman run tests/postman/recipe-hub.postman_collection.json \
  -e tests/postman/environments/cloud.postman_environment.json
```

Либо разово, не редактируя файл окружения:

```bash
npx newman run tests/postman/recipe-hub.postman_collection.json \
  --env-var baseUrl=http://<IP-балансировщика>/api
```

## Запуск в Postman UI

1. **Import** → коллекция и файл окружения.
2. Выбери окружение `RecipeHub — local` или `RecipeHub — cloud`.
3. **Run** (Collection Runner) → отметь все папки → **Run**.
4. Вкладка **Documentation** покажет описания папок и ключевых запросов — это
   и есть «документация средствами Postman».

## Проверки

Каждый запрос содержит `pm.test`: статус-код, обязательные поля ответа и, где
уместно, конверт пагинации `{ items, total, page, limit }`. Для негативных
сценариев проверяются `404` (сущность удалена) и `401` (вход удалённого
пользователя запрещён).

## CI

Коллекция запускается автоматически:

- в CI после E2E-тестов на `docker compose` — бесплатно;
- в `deploy-cloud.yml` после деплоя в облако — против реального IP
  балансировщика.

Логи Newman сохраняются артефактом соответствующего workflow.
