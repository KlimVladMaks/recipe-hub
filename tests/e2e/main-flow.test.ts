/**
 * Сквозной сценарий основного потока (аналог Postman-коллекции):
 * регистрация → вход → рецепт → шаг → комментарий/лайк → рейтинг →
 * сохранение → подписка читателя → лента.
 */
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { api, del, expectStatus, get, put } from './helpers/api.ts';
import { TestContext } from './helpers/factory.ts';
import { uniqueTitle } from './helpers/unique.ts';

const ctx = new TestContext();
after(async () => {
    await ctx.cleanup();
});

describe('Main flow', () => {
    it('проходит полный путь от регистрации до ленты', async () => {
        // 1. Автор регистрируется и входит (createUser делает и то, и другое).
        const author = await ctx.createUser({ about: 'Люблю готовить' });

        // 2. Автор создаёт опубликованный рецепт.
        const recipeTitle = uniqueTitle('Борщ');
        const recipe = await ctx.createRecipe(author, {
            title: recipeTitle,
            description: 'Классический борщ',
            difficulty: 'medium',
            isPublished: true,
            media: [{ sortOrder: 0, mediaType: 'photo', mediaUrl: 'https://example.com/borsch.jpg' }],
        });
        assert.equal(recipe.author.id, author.id);

        // 3. Добавляет шаг.
        const step = await api(`/recipes/${recipe.id}/steps`, {
            method: 'POST',
            token: author.token,
            body: { number: 1, title: 'Сварить бульон', description: 'Варить 2 часа' },
        });
        expectStatus(step, 201);

        // 4. Рецепт находится поиском.
        const search = await get(`/recipes?search=${encodeURIComponent(recipeTitle)}&difficulty=medium`, author.token);
        expectStatus(search, 200);
        assert.ok(search.body.items.some((item: any) => item.id === recipe.id));

        // 5. Комментарий и лайк.
        const comment = await api<{ id: number }>(`/recipes/${recipe.id}/comments`, {
            method: 'POST',
            token: author.token,
            body: { text: 'Отличный рецепт!' },
        });
        expectStatus(comment, 201);

        const like = await api(`/recipes/${recipe.id}/comments/${comment.body.id}/like`, {
            method: 'POST',
            token: author.token,
        });
        expectStatus(like, 200);

        // 6. Рейтинг.
        const rating = await put(`/recipes/${recipe.id}/rating`, { rating: 9 }, author.token);
        expectStatus(rating, 200);
        assert.equal(rating.body.userRating, 9);

        // 7. Сохранение рецепта.
        const save = await api(`/recipes/${recipe.id}/save`, { method: 'POST', token: author.token });
        expectStatus(save, 200);
        const savedList = await get('/users/me/saved-recipes', author.token);
        expectStatus(savedList, 200);
        assert.ok(savedList.body.items.some((item: any) => item.id === recipe.id));

        // 8. Читатель регистрируется, подписывается на автора и видит рецепт в ленте.
        const reader = await ctx.createUser();
        const subscribe = await api(`/users/${author.id}/subscribe`, { method: 'POST', token: reader.token });
        expectStatus(subscribe, 200);

        const feed = await get('/users/me/feed', reader.token);
        expectStatus(feed, 200);
        assert.ok(feed.body.items.some((item: any) => item.id === recipe.id));

        // 9. Очистка: удаляем рецепт и проверяем, что он пропал.
        const removeRecipe = await del(`/recipes/${recipe.id}`, author.token);
        expectStatus(removeRecipe, 204);

        const gone = await get(`/recipes/${recipe.id}`, author.token);
        expectStatus(gone, 404);
    });
});
