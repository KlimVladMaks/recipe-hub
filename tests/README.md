# E2E-тесты RecipeHub

Тесты «чёрного ящика»: все запросы идут только через **API-шлюз**
(`http://localhost:3000/api`) по HTTP. Внутренний код сервисов не импортируется,
проверяются исключительно контракты эндпоинтов из `docs/openapi.yaml`.

## Стек

- [`node:test`](https://nodejs.org/api/test.html) — встроенный раннер Node.js (`describe` / `it`);
- `node:assert/strict` — проверки;
- `tsx` — запуск TypeScript без отдельной сборки;
- TypeScript — типы для тестов и хелперов.

Никаких Jest/Vitest: ноль лишних зависимостей, понятный вывод «pass/fail» прямо в терминале.

## Быстрый старт

Из корня репозитория поднимите стек:

```bash
docker compose up -d --build
```

Затем запустите тесты:

```bash
cd tests
npm install
npm test
```

Либо одной командой (поднимет стек, дождётся готовности и прогонит тесты):

```bash
cd tests
npm install
npm run test:stack
```

## Команды

| Команда                 | Что делает                                                        |
| ----------------------- | ----------------------------------------------------------------- |
| `npm test`              | Прогон тестов против уже поднятого стека (проверяет его доступность) |
| `npm run test:stack`    | `docker compose up -d --build` → ожидание health → `npm test`      |
| `npm run test:watch`    | То же, что `npm test`, но в режиме наблюдения                     |
| `npm run typecheck`     | `tsc --noEmit` — проверка типов тестов                            |

Адрес API можно переопределить переменной окружения:

```bash
TEST_BASE_URL=http://localhost:3000/api npm test
```

Учётные данные admin-тестов (по умолчанию совпадают с `ADMIN_USERNAME`/`ADMIN_PASSWORD`
user-service, см. ниже) можно переопределить через `TEST_ADMIN_USERNAME` / `TEST_ADMIN_PASSWORD`:

```bash
TEST_ADMIN_USERNAME=admin TEST_ADMIN_PASSWORD=admin123 npm test
```

## Структура

```text
tests/
  package.json
  tsconfig.json
  scripts/
    check-stack.ts     # проверка доступности стека (выполняется в npm test)
    stack-up.ts        # поднятие стека + ожидание health (npm run test:stack)
  e2e/
    helpers/
      api.ts           # fetch-обёртка, BASE_URL, waitForStack, expectStatus
      factory.ts       # TestContext: создание и гарантированная очистка данных
      unique.ts        # генерация уникальных имён для изоляции прогонов
    health.test.ts
    auth.test.ts
    users.test.ts       # пользователи, публичные списки, подписки
    recipes.test.ts
    steps-comments.test.ts
    social.test.ts
    admin.test.ts      # админские сценарии (нужен bootstrap-админ)
    validation.test.ts # ошибки 400 и недействительные токены 401
    main-flow.test.ts  # сквозной сценарий
```

## Bootstrap-администратор

Зарегистрировать администратора через API нельзя: регистрация всегда создаёт
`role: 'user'`, а сменить роль может только уже существующий админ. Чтобы разорвать
этот порочный круг, **user-service при старте** идемпотентно создаёт (или повышает)
пользователя с логином `ADMIN_USERNAME` и паролем `ADMIN_PASSWORD` из `.env`
(см. `services/user/src/services/adminBootstrap.ts`).

- Значения по умолчанию: `admin` / `admin123`.
- Если переменные не заданы — фича отключена, тесты `admin.test.ts` упадут на входе.
- После смены этих переменных пересоберите/перезапустите `user-service`.
- Bootstrap-админ — это намеренные данные, очистка тестов его **не** удаляет.

Войти под ним можно и вручную (Swagger/curl), взяв JWT через `POST /api/auth/login`.

## Правила написания тестов

1. **Только HTTP.** Тестируйте публичные эндпоинты через `helpers/api.ts`, не
   импортируйте код сервисов и не ходите напрямую в БД.
2. **Никакого мусора.** Каждый файл создаёт `TestContext`, регистрирует в нём
   сущности и вызывает `ctx.cleanup()` в `after()`. Очистка удаляет рецепты
   (каскадно — шаги, комментарии, лайки, рейтинги, сохранения) и пользователей.
3. **Изолированные данные.** Используйте `uniqueName` / `uniqueTitle`, чтобы
   прогоны не зависели от уже существующих записей и не конфликтовали между
   файлами (они выполняются параллельно).
4. **Читаемые ассерты.** Проверяйте статус через `expectStatus(response, 200)` —
   при ошибке в сообщение попадёт тело ответа.

## Пример нового теста

```ts
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { expectStatus, get } from './helpers/api.ts';
import { TestContext } from './helpers/factory.ts';

const ctx = new TestContext();
after(() => ctx.cleanup());

describe('My feature', () => {
    it('делает что-то', async () => {
        const user = await ctx.createUser();
        const response = await get('/users/me', user.token);
        expectStatus(response, 200);
        assert.equal(response.body.id, user.id);
    });
});
```

Файл с именем `*.test.ts` в каталоге `e2e/` подхватится автоматически.
