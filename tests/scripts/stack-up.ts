/**
 * Поднимает локальный стек (docker compose up -d --build) и дожидается
 * готовности API-шлюза. Используется командой `npm run test:stack`.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { BASE_URL, waitForStack } from '../e2e/helpers/api.ts';

const testsDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const composeFile = path.resolve(testsDir, '..', 'docker-compose.yml');

console.log('▶ Поднимаю стек: docker compose up -d --build');
const result = spawnSync('docker', ['compose', '-f', composeFile, 'up', '-d', '--build'], {
    stdio: 'inherit',
});

if (result.status !== 0) {
    console.error('\n✖ Не удалось поднять стек через docker compose.');
    process.exit(result.status ?? 1);
}

console.log('\n▶ Ожидаю готовности API…');
try {
    await waitForStack(180_000, 2_000);
    console.log(`✔ Стек готов: ${BASE_URL}\n`);
} catch (error) {
    console.error(`✖ Стек не поднялся: ${BASE_URL}\n`);
    console.error(String(error));
    process.exit(1);
}
