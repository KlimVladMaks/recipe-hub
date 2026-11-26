# Postman-коллекция RecipeHub (E2E)

`recipe-hub.postman_collection.json` — самодостаточный сценарий проверки API
RecipeHub. Работает и против локального стека (`docker compose`), и против
стенда в облаке: адрес задаётся переменной окружения `baseUrl`, сама коллекция
от окружения не зависит.

Коллекция заодно служит документацией: у всех папок и ключевых запросов есть
описания, которые Postman показывает на вкладке **Documentation**.

## Состав

| Файл | Назначение |
|---|---|
| `recipe-hub.postman_collection.json` | 52 запроса, 4 папки, проверки `pm.test` |
| `environments/local.postman_environment.json` | `baseUrl=http://localhost:3000/api`, учётка bootstrap-админа |
| `environments/cloud.postman_environment.json` | шаблон `http://<IP-балансировщика>/api` для стенда в Yandex Cloud |

## Что проверяется

| Папка | Запросов | Что покрывает |
|---|---|---|
| 1. Health | 3 | доступность шлюза, user- и recipe-сервиса через `/api/*-health` |
| 2. Справочники | 5 | вход bootstrap-админа, создание типа блюда и ингредиента, поиск по названию |
| 3. Основной сценарий | 30 | регистрация автора и подписчика, два рецепта с медиа и шагами, фильтры `difficulty`/`dishTypeIds`/`ingredientIds`, обновление, рейтинг, комментарий и лайки, избранное, подписка, персональная лента |
| 4. Очистка | 14 | удаление всего созданного, проверка `404` и запрет входа удалённых пользователей (`401`) |

Все ответы валидируются `pm.test`: статус-коды, обязательные поля и конверт
пагинации `{ items, total, page, limit }`.

## Запуск локально

```bash
docker compose up -d --build
cd tests
npm install          # поставит newman из devDependencies
npm run test:postman
```

По умолчанию коллекция обращается к `http://localhost:3000/api` — этого
достаточно, отдельное окружение подключать не обязательно.

## Запуск против облака

1. Подними стенд (`gh workflow run infra.yml -f action=apply`, затем
   `deploy-cloud.yml` с `action=deploy`) и узнай IP балансировщика из
   summary workflow или `kubectl get svc api-gateway`.
2. Подставь адрес одним из способов:

```bash
# файл окружения: замени <IP-балансировщика> на реальный адрес
npx newman run tests/postman/recipe-hub.postman_collection.json \
  -e tests/postman/environments/cloud.postman_environment.json
```

```bash
# или разовой переменной, не трогая файл окружения
npx newman run tests/postman/recipe-hub.postman_collection.json \
  --env-var baseUrl=http://<IP-балансировщика>/api
```

`baseUrl` уже включает суффикс `/api`, поэтому в запросах путь указывается без
него: `{{baseUrl}}/auth/register`.

## Запуск в Postman UI

1. **Import** → `recipe-hub.postman_collection.json` и нужный файл из
   `environments/`.
2. Выбери окружение в правом верхнем углу (для локального стека — `RecipeHub — local`).
3. Открой коллекцию → **Run** (Collection Runner) → все папки → **Run**.
4. Для чтения документации открой коллекцию и нажми **Documentation** —
   описания папок и ключевых запросов отображаются там же.

Сценарий автоматический: имена пользователей, названия справочников и текст
комментария генерируются в pre-request скриптах, поэтому повторные прогоны не
конфликтуют с уже существующими данными.

## Учётные данные

- Bootstrap-админ: `admin` / `admin123` (создаётся user-service из
  `ADMIN_USERNAME`/`ADMIN_PASSWORD`, в коллекции — переменные
  `adminUsername`/`adminPassword`). Если на стенде они изменены, поправь
  окружение. Админ намеренно **не удаляется** — это служебная seed-запись.
- Обычные пользователи создаются и удаляются внутри сценария.

## Чистота данных

Порядок папок и запросов важен: очистка идёт последней и использует id,
сохранённые в переменные на предыдущих шагах. После успешного прогона в БД не
остаётся созданных сущностей: каждый `DELETE` проверяется повторным `GET`
(ожидается `404`), а вход удалённых пользователей — `401`.

Если какой-то assert упал, Newman продолжает выполнение, поэтому очистка всё
равно отработает — кроме случая, когда сущность не создалась и переменная
осталась пустой.

## CI

Коллекция запускается в двух workflow:

- `.github/workflows/ci.yml` — после E2E-тестов на локальном `docker compose`
  (`npm run test:postman -- --env-var baseUrl=http://localhost:3000/api`);
- `.github/workflows/deploy-cloud.yml` — против облачного стенда после деплоя,
  с `--env-var baseUrl=http://<IP>/api`.

Логи Newman сохраняются артефактом workflow.

## Связанные документы

- OpenAPI-спецификация: `docs/openapi.yaml`, Swagger UI — `/api-docs` на шлюзе.
- E2E-тесты на `node:test`: `tests/README.md`.
