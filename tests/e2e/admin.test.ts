/**
 * Админские сценарии: управление справочниками (типы блюд, ингредиенты),
 * список пользователей и смена ролей.
 *
 * Админ создаётся user-service при старте из ADMIN_USERNAME / ADMIN_PASSWORD
 * (см. services/user/src/services/adminBootstrap.ts).
 */
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { api, del, expectStatus, get, patch } from './helpers/api.ts';
import { loginAsAdmin, TestContext } from './helpers/factory.ts';
import { uniqueTitle } from './helpers/unique.ts';

const ctx = new TestContext();
after(async () => {
    await ctx.cleanup();
});

describe('Admin: access control', () => {
    it('bootstrap-админ существует и может войти', async () => {
        const admin = await loginAsAdmin();

        const me = await get('/users/me', admin.token);
        expectStatus(me, 200);
        assert.equal(me.body.role, 'admin');
    });

    it('обычный пользователь не может создавать справочники (403)', async () => {
        const user = await ctx.createUser();

        const dishType = await api('/dish-types', {
            method: 'POST',
            token: user.token,
            body: { title: uniqueTitle('Тип') },
        });
        expectStatus(dishType, 403);

        const ingredient = await api('/ingredients', {
            method: 'POST',
            token: user.token,
            body: { title: uniqueTitle('Ингредиент') },
        });
        expectStatus(ingredient, 403);
    });

    it('обычный пользователь не может смотреть список пользователей (403)', async () => {
        const user = await ctx.createUser();
        const response = await get('/users', user.token);
        expectStatus(response, 403);
    });
});

describe('Admin: dish types', () => {
    it('полный CRUD типа блюда', async () => {
        const admin = await loginAsAdmin();
        const title = uniqueTitle('Десерт');

        const created = await ctx.createDishType(admin, title);
        assert.equal(created.title, title);

        const fetched = await get(`/dish-types/${created.id}`, admin.token);
        expectStatus(fetched, 200);
        assert.equal(fetched.body.id, created.id);

        const updated = await patch(`/dish-types/${created.id}`, { title: `${title} v2` }, admin.token);
        expectStatus(updated, 200);
        assert.match(updated.body.title, /v2$/);

        const removed = await del(`/dish-types/${created.id}`, admin.token);
        expectStatus(removed, 204);

        const gone = await get(`/dish-types/${created.id}`, admin.token);
        expectStatus(gone, 404);
    });
});

describe('Admin: ingredients', () => {
    it('полный CRUD ингредиента', async () => {
        const admin = await loginAsAdmin();
        const title = uniqueTitle('Свёкла');

        const created = await ctx.createIngredient(admin, title);
        assert.equal(created.title, title);

        const fetched = await get(`/ingredients/${created.id}`, admin.token);
        expectStatus(fetched, 200);
        assert.equal(fetched.body.id, created.id);

        const updated = await patch(`/ingredients/${created.id}`, { title: `${title} v2` }, admin.token);
        expectStatus(updated, 200);
        assert.match(updated.body.title, /v2$/);

        const removed = await del(`/ingredients/${created.id}`, admin.token);
        expectStatus(removed, 204);

        const gone = await get(`/ingredients/${created.id}`, admin.token);
        expectStatus(gone, 404);
    });
});

describe('Admin: users', () => {
    it('админ видит список пользователей', async () => {
        const admin = await loginAsAdmin();
        const response = await get('/users?page=1&limit=5', admin.token);
        expectStatus(response, 200);
        assert.ok(Array.isArray(response.body.items));
        assert.ok(response.body.total >= 1);
    });

    it('админ может сменить роль пользователя и обратно', async () => {
        const admin = await loginAsAdmin();
        const user = await ctx.createUser();

        const promoted = await patch(`/users/${user.id}/role`, { role: 'admin' }, admin.token);
        expectStatus(promoted, 200);
        assert.equal(promoted.body.role, 'admin');

        const demoted = await patch(`/users/${user.id}/role`, { role: 'user' }, admin.token);
        expectStatus(demoted, 200);
        assert.equal(demoted.body.role, 'user');
    });
});
