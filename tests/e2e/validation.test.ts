/**
 * Обработка ошибок: валидация запросов (400) и недействительные токены (401).
 */
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { api, expectStatus, get, put } from './helpers/api.ts';
import { TestContext } from './helpers/factory.ts';
import { uniqueTitle } from './helpers/unique.ts';

const ctx = new TestContext();
after(async () => {
    await ctx.cleanup();
});

describe('Validation errors', () => {
    it('регистрация без обязательного поля даёт 400', async () => {
        const response = await api('/auth/register', {
            method: 'POST',
            body: {
                username: uniqueTitle('nofield'),
                password: 'password123',
                firstName: 'Имя',
                // lastName отсутствует
            },
        });
        expectStatus(response, 400);
        assert.ok(response.body.error);
    });

    it('создание рецепта без isPublished даёт 400', async () => {
        const user = await ctx.createUser();
        const response = await api('/recipes', {
            method: 'POST',
            token: user.token,
            body: { title: uniqueTitle('Без флага') },
        });
        expectStatus(response, 400);
    });

    it('некорректный difficulty в фильтре даёт 400', async () => {
        const user = await ctx.createUser();
        const response = await get('/recipes?difficulty=impossible', user.token);
        expectStatus(response, 400);
    });

    it('оценка вне диапазона 1..10 даёт 400', async () => {
        const author = await ctx.createUser();
        const recipe = await ctx.createRecipe(author, { title: uniqueTitle('Рейтинг'), isPublished: true });

        const tooLow = await put(`/recipes/${recipe.id}/rating`, { rating: 0 }, author.token);
        expectStatus(tooLow, 400);

        const tooHigh = await put(`/recipes/${recipe.id}/rating`, { rating: 11 }, author.token);
        expectStatus(tooHigh, 400);
    });
});

describe('Invalid tokens', () => {
    it('подделанный JWT даёт 401', async () => {
        const response = await api('/users/me', { token: 'not.a.valid.token' });
        expectStatus(response, 401);
    });

    it('эндпоинт рецептов без токена даёт 401', async () => {
        const response = await get('/recipes');
        expectStatus(response, 401);
    });
});
