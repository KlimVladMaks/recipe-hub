/**
 * Пользовательские эндпоинты, публичные списки и подписки.
 * Дополняет auth.test.ts и social.test.ts краевыми сценариями.
 */
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { api, del, expectStatus, get } from './helpers/api.ts';
import { loginAsAdmin, TestContext } from './helpers/factory.ts';
import { uniqueTitle } from './helpers/unique.ts';

const ctx = new TestContext();
after(async () => {
    await ctx.cleanup();
});

describe('Users: read', () => {
    it('возвращает пользователя по id и 404 для несуществующего', async () => {
        const user = await ctx.createUser();

        const found = await get(`/users/${user.id}`, user.token);
        expectStatus(found, 200);
        assert.equal(found.body.id, user.id);
        assert.equal(found.body.username, user.username);

        const missing = await get('/users/999999999', user.token);
        expectStatus(missing, 404);
    });

    it('не отдаёт пароль в теле пользователя', async () => {
        const user = await ctx.createUser();
        const response = await get(`/users/${user.id}`, user.token);
        expectStatus(response, 200);
        assert.equal(response.body.passwordHash, undefined);
        assert.equal(response.body.password, undefined);
    });
});

describe('Users: recipes', () => {
    it('публичный список содержит только опубликованные рецепты', async () => {
        const author = await ctx.createUser();
        const viewer = await ctx.createUser();
        const publishedTitle = uniqueTitle('Публичный');
        const draftTitle = uniqueTitle('Черновик');

        const published = await ctx.createRecipe(author, { title: publishedTitle, isPublished: true });
        const draft = await ctx.createRecipe(author, { title: draftTitle, isPublished: false });

        const response = await get(`/users/${author.id}/recipes?limit=100`, viewer.token);
        expectStatus(response, 200);
        assert.ok(response.body.items.some((recipe: any) => recipe.id === published.id));
        assert.ok(!response.body.items.some((recipe: any) => recipe.id === draft.id));
    });
});

describe('Users: saved recipes', () => {
    it('публичный список сохранённых рецептов пользователя', async () => {
        const author = await ctx.createUser();
        const reader = await ctx.createUser();
        const recipe = await ctx.createRecipe(author, { title: uniqueTitle('Сохранит'), isPublished: true });

        const saved = await api(`/recipes/${recipe.id}/save`, { method: 'POST', token: reader.token });
        expectStatus(saved, 200);

        const response = await get(`/users/${reader.id}/saved-recipes`, author.token);
        expectStatus(response, 200);
        assert.ok(response.body.items.some((item: any) => item.id === recipe.id));
    });
});

describe('Subscriptions: lists', () => {
    it('подписчики текущего пользователя и подписки указанного пользователя', async () => {
        const author = await ctx.createUser();
        const reader = await ctx.createUser();

        const subscribe = await api(`/users/${author.id}/subscribe`, { method: 'POST', token: reader.token });
        expectStatus(subscribe, 200);

        const subscribers = await get('/users/me/subscribers', author.token);
        expectStatus(subscribers, 200);
        assert.ok(subscribers.body.items.some((user: any) => user.id === reader.id));

        const subscriptionsOfReader = await get(`/users/${reader.id}/subscriptions`, author.token);
        expectStatus(subscriptionsOfReader, 200);
        assert.ok(subscriptionsOfReader.body.items.some((user: any) => user.id === author.id));
    });
});

describe('Admin: delete user', () => {
    it('админ может удалить пользователя, после чего тот не находится', async () => {
        const admin = await loginAsAdmin();
        const victim = await ctx.createUser();

        const removed = await del(`/users/${victim.id}`, admin.token);
        expectStatus(removed, 204);

        const gone = await get(`/users/${victim.id}`, admin.token);
        expectStatus(gone, 404);
    });
});
