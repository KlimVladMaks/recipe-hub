/**
 * Базовые сценарии авторизации и работы с текущим пользователем.
 */
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { api, expectStatus, get, patch } from './helpers/api.ts';
import { DEFAULT_PASSWORD, TestContext } from './helpers/factory.ts';
import { uniqueName } from './helpers/unique.ts';

const ctx = new TestContext();
after(() => ctx.cleanup());

describe('Auth', () => {
    it('регистрирует пользователя и отдаёт его JWT', async () => {
        const user = await ctx.createUser({ about: 'Люблю готовить' });

        const me = await get('/users/me', user.token);
        expectStatus(me, 200);
        assert.equal(me.body.id, user.id);
        assert.equal(me.body.username, user.username);
        assert.equal(me.body.role, 'user');
        assert.equal(me.body.about, 'Люблю готовить');
    });

    it('повторная регистрация с тем же username даёт 409', async () => {
        const user = await ctx.createUser();

        const response = await api('/auth/register', {
            method: 'POST',
            body: {
                username: user.username,
                password: DEFAULT_PASSWORD,
                firstName: 'Другой',
                lastName: 'Пользователь',
            },
        });
        expectStatus(response, 409);
    });

    it('вход с неверным паролем даёт 401', async () => {
        const username = uniqueName('auth');
        await ctx.createUser({ username });

        const response = await api('/auth/login', {
            method: 'POST',
            body: { username, password: 'wrong-password' },
        });
        expectStatus(response, 401);
    });

    it('запрос без токена даёт 401', async () => {
        const response = await get('/users/me');
        expectStatus(response, 401);
    });

    it('PATCH /users/me обновляет профиль', async () => {
        const user = await ctx.createUser();

        const response = await patch('/users/me', { firstName: 'Обновлённый', about: 'Новое описание' }, user.token);
        expectStatus(response, 200);
        assert.equal(response.body.firstName, 'Обновлённый');

        const me = await get('/users/me', user.token);
        expectStatus(me, 200);
        assert.equal(me.body.firstName, 'Обновлённый');
        assert.equal(me.body.about, 'Новое описание');
    });

    it('позволяет сменить пароль и войти с новым', async () => {
        const user = await ctx.createUser();
        const newPassword = 'new-password-456';

        const change = await patch(
            '/users/me/password',
            { oldPassword: user.password, newPassword },
            user.token
        );
        expectStatus(change, 200);

        const loginNew = await api('/auth/login', {
            method: 'POST',
            body: { username: user.username, password: newPassword },
        });
        expectStatus(loginNew, 200);

        const loginOld = await api('/auth/login', {
            method: 'POST',
            body: { username: user.username, password: user.password },
        });
        expectStatus(loginOld, 401);
    });

    it('обычный пользователь не может получить список пользователей (403)', async () => {
        const user = await ctx.createUser();
        const response = await get('/users', user.token);
        expectStatus(response, 403);
    });

    it('удаление пользователя делает вход невозможным', async () => {
        const user = await ctx.createUser();

        const remove = await api('/users/me', { method: 'DELETE', token: user.token });
        expectStatus(remove, 204);

        const login = await api('/auth/login', {
            method: 'POST',
            body: { username: user.username, password: user.password },
        });
        expectStatus(login, 401);
    });
});
