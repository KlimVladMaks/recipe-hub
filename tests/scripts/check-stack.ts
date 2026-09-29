/**
 * Проверяет, что стек поднят и доступен, перед запуском тестов.
 * Выполняется автоматически в `npm test`.
 */
import { BASE_URL, waitForStack } from '../e2e/helpers/api.ts';

try {
    await waitForStack(20_000, 1_000);
    console.log(`✔ Стек доступен: ${BASE_URL}`);
} catch (error) {
    console.error(`✖ Стек недоступен: ${BASE_URL}\n`);
    console.error(String(error));
    console.error(
        '\nПоднимите сервисы командой `docker compose up -d --build` в корне репозитория\n' +
            'или запустите `npm run test:stack` — он поднимет стек и сразу прогонит тесты.'
    );
    process.exit(1);
}
