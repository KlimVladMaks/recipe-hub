/**
 * Health-проверки: шлюз и прокси к health-эндпоинтам сервисов.
 * Самый быстрый способ убедиться, что стек поднялся.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { get, expectStatus } from './helpers/api.ts';

describe('Health', () => {
    it('API-шлюз отвечает', async () => {
        const response = await get('/api-gateway-health');
        expectStatus(response, 200);
        assert.match(response.body.status, /OK/);
    });

    it('user-service доступен через шлюз', async () => {
        const response = await get('/user-service-health');
        expectStatus(response, 200);
        assert.match(response.body.status, /OK/);
    });

    it('recipe-service доступен через шлюз', async () => {
        const response = await get('/recipe-service-health');
        expectStatus(response, 200);
        assert.match(response.body.status, /OK/);
    });
});
