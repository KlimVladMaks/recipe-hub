/**
 * Базовые сценарии шагов рецепта и комментариев (включая лайки).
 */
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { api, del, expectStatus, get, patch } from './helpers/api.ts';
import { TestContext } from './helpers/factory.ts';
import { uniqueTitle } from './helpers/unique.ts';

const ctx = new TestContext();
after(async () => {
    await ctx.cleanup();
});

describe('Steps', () => {
    it('создаёт, читает, обновляет и удаляет шаг', async () => {
        const author = await ctx.createUser();
        const recipe = await ctx.createRecipe(author, { title: uniqueTitle('С шагами'), isPublished: true });

        const created = await api(`/recipes/${recipe.id}/steps`, {
            method: 'POST',
            token: author.token,
            body: { number: 1, title: 'Сварить бульон', description: 'Варить 2 часа' },
        });
        expectStatus(created, 201);
        assert.equal(created.body.number, 1);

        const list = await get(`/recipes/${recipe.id}/steps`, author.token);
        expectStatus(list, 200);
        assert.ok(Array.isArray(list.body));
        assert.ok(list.body.some((step: any) => step.id === created.body.id));

        const one = await get(`/recipes/${recipe.id}/steps/${created.body.id}`, author.token);
        expectStatus(one, 200);

        const updated = await patch(
            `/recipes/${recipe.id}/steps/${created.body.id}`,
            { title: 'Обновлённый шаг' },
            author.token
        );
        expectStatus(updated, 200);
        assert.equal(updated.body.title, 'Обновлённый шаг');

        const removed = await del(`/recipes/${recipe.id}/steps/${created.body.id}`, author.token);
        expectStatus(removed, 204);

        const gone = await get(`/recipes/${recipe.id}/steps/${created.body.id}`, author.token);
        expectStatus(gone, 404);
    });

    it('нельзя добавить шаг к несуществующему рецепту (404)', async () => {
        const user = await ctx.createUser();
        const response = await api('/recipes/999999999/steps', {
            method: 'POST',
            token: user.token,
            body: { number: 1, title: 'Ни к чему' },
        });
        expectStatus(response, 404);
    });
});

describe('Comments', () => {
    it('создаёт, читает и обновляет комментарий', async () => {
        const author = await ctx.createUser();
        const recipe = await ctx.createRecipe(author, { title: uniqueTitle('С комментами'), isPublished: true });

        const created = await api(`/recipes/${recipe.id}/comments`, {
            method: 'POST',
            token: author.token,
            body: { text: 'Отличный рецепт!' },
        });
        expectStatus(created, 201);
        assert.equal(created.body.text, 'Отличный рецепт!');
        assert.equal(created.body.user.id, author.id);

        const list = await get(`/recipes/${recipe.id}/comments`, author.token);
        expectStatus(list, 200);
        assert.ok(list.body.items.some((comment: any) => comment.id === created.body.id));

        const updated = await patch(
            `/recipes/${recipe.id}/comments/${created.body.id}`,
            { text: 'Уточню: очень вкусно' },
            author.token
        );
        expectStatus(updated, 200);
        assert.equal(updated.body.text, 'Уточню: очень вкусно');
    });

    it('запрещает редактировать чужой комментарий (403)', async () => {
        const author = await ctx.createUser();
        const stranger = await ctx.createUser();
        const recipe = await ctx.createRecipe(author, { title: uniqueTitle('Чужой коммент'), isPublished: true });

        const created = await api(`/recipes/${recipe.id}/comments`, {
            method: 'POST',
            token: author.token,
            body: { text: 'Мой комментарий' },
        });
        expectStatus(created, 201);

        const response = await patch(
            `/recipes/${recipe.id}/comments/${created.body.id}`,
            { text: 'Правка чужим' },
            stranger.token
        );
        expectStatus(response, 403);
    });

    it('удаляет комментарий (автор) и он пропадает', async () => {
        const author = await ctx.createUser();
        const recipe = await ctx.createRecipe(author, { title: uniqueTitle('Удалить коммент'), isPublished: true });

        const created = await api<{ id: number }>(`/recipes/${recipe.id}/comments`, {
            method: 'POST',
            token: author.token,
            body: { text: 'Временный комментарий' },
        });
        expectStatus(created, 201);

        const removed = await del(`/recipes/${recipe.id}/comments/${created.body.id}`, author.token);
        expectStatus(removed, 204);

        const gone = await get(`/recipes/${recipe.id}/comments/${created.body.id}`, author.token);
        expectStatus(gone, 404);
    });

    it('ставит и убирает лайк комментария', async () => {
        const author = await ctx.createUser();
        const recipe = await ctx.createRecipe(author, { title: uniqueTitle('Лайки'), isPublished: true });
        const commented = await api<{ id: number }>(`/recipes/${recipe.id}/comments`, {
            method: 'POST',
            token: author.token,
            body: { text: 'Лайкните меня' },
        });
        expectStatus(commented, 201);
        const commentId = commented.body.id;

        const before = await get(`/recipes/${recipe.id}/comments/${commentId}/like`, author.token);
        expectStatus(before, 200);
        assert.equal(before.body.isLiked, false);

        const liked = await api(`/recipes/${recipe.id}/comments/${commentId}/like`, {
            method: 'POST',
            token: author.token,
        });
        expectStatus(liked, 200);

        const after = await get(`/recipes/${recipe.id}/comments/${commentId}/like`, author.token);
        expectStatus(after, 200);
        assert.equal(after.body.isLiked, true);

        const unliked = await del(`/recipes/${recipe.id}/comments/${commentId}/like`, author.token);
        expectStatus(unliked, 204);

        const final = await get(`/recipes/${recipe.id}/comments/${commentId}/like`, author.token);
        expectStatus(final, 200);
        assert.equal(final.body.isLiked, false);
    });
});
