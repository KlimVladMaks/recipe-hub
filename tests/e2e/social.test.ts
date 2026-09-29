/**
 * Социальные функции: рейтинги, сохранённые рецепты, подписки и персональная лента.
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

describe('Ratings', () => {
    it('ставит, обновляет и удаляет оценку рецепта', async () => {
        const author = await ctx.createUser();
        const recipe = await ctx.createRecipe(author, { title: uniqueTitle('Рейтинг'), isPublished: true });

        const empty = await get(`/recipes/${recipe.id}/rating`, author.token);
        expectStatus(empty, 200);
        assert.equal(empty.body.avgRating, null);
        assert.equal(empty.body.userRating, null);

        const rated = await put(`/recipes/${recipe.id}/rating`, { rating: 9 }, author.token);
        expectStatus(rated, 200);
        assert.equal(rated.body.avgRating, 9);
        assert.equal(rated.body.userRating, 9);

        const updated = await put(`/recipes/${recipe.id}/rating`, { rating: 5 }, author.token);
        expectStatus(updated, 200);
        assert.equal(updated.body.avgRating, 5);
        assert.equal(updated.body.userRating, 5);

        const removed = await del(`/recipes/${recipe.id}/rating`, author.token);
        expectStatus(removed, 204);

        const afterDelete = await get(`/recipes/${recipe.id}/rating`, author.token);
        expectStatus(afterDelete, 200);
        assert.equal(afterDelete.body.avgRating, null);
    });
});

describe('Saved recipes', () => {
    it('сохраняет рецепт, показывает в списке и убирает из сохранённых', async () => {
        const author = await ctx.createUser();
        const reader = await ctx.createUser();
        const recipe = await ctx.createRecipe(author, { title: uniqueTitle('Сохранённый'), isPublished: true });

        const before = await get(`/recipes/${recipe.id}/save`, reader.token);
        expectStatus(before, 200);
        assert.equal(before.body.isSaved, false);

        const saved = await api(`/recipes/${recipe.id}/save`, { method: 'POST', token: reader.token });
        expectStatus(saved, 200);

        const isSaved = await get(`/recipes/${recipe.id}/save`, reader.token);
        expectStatus(isSaved, 200);
        assert.equal(isSaved.body.isSaved, true);

        const list = await get('/users/me/saved-recipes', reader.token);
        expectStatus(list, 200);
        assert.ok(list.body.items.some((item: any) => item.id === recipe.id));

        const unsaved = await del(`/recipes/${recipe.id}/save`, reader.token);
        expectStatus(unsaved, 200);

        const isSavedAfter = await get(`/recipes/${recipe.id}/save`, reader.token);
        expectStatus(isSavedAfter, 200);
        assert.equal(isSavedAfter.body.isSaved, false);
    });
});

describe('Subscriptions', () => {
    it('подписка, проверка, списки и отписка', async () => {
        const author = await ctx.createUser();
        const reader = await ctx.createUser();

        const subscribe = await api(`/users/${author.id}/subscribe`, { method: 'POST', token: reader.token });
        expectStatus(subscribe, 200);

        const isSubscribed = await get(`/users/${author.id}/subscribe`, reader.token);
        expectStatus(isSubscribed, 200);
        assert.equal(isSubscribed.body.isSubscribed, true);

        const subscriptions = await get('/users/me/subscriptions', reader.token);
        expectStatus(subscriptions, 200);
        assert.ok(subscriptions.body.items.some((user: any) => user.id === author.id));

        const subscribers = await get(`/users/${author.id}/subscribers`, author.token);
        expectStatus(subscribers, 200);
        assert.ok(subscribers.body.items.some((user: any) => user.id === reader.id));

        const unsubscribe = await del(`/users/${author.id}/subscribe`, reader.token);
        expectStatus(unsubscribe, 204);

        const isSubscribedAfter = await get(`/users/${author.id}/subscribe`, reader.token);
        expectStatus(isSubscribedAfter, 200);
        assert.equal(isSubscribedAfter.body.isSubscribed, false);
    });

    it('повторная подписка даёт 409, а на себя — 400', async () => {
        const author = await ctx.createUser();
        const reader = await ctx.createUser();

        const first = await api(`/users/${author.id}/subscribe`, { method: 'POST', token: reader.token });
        expectStatus(first, 200);

        const duplicate = await api(`/users/${author.id}/subscribe`, { method: 'POST', token: reader.token });
        expectStatus(duplicate, 409);

        const self = await api(`/users/${reader.id}/subscribe`, { method: 'POST', token: reader.token });
        expectStatus(self, 400);

        const missing = await del('/users/999999999/subscribe', reader.token);
        expectStatus(missing, 404);
    });
});

describe('Feed', () => {
    it('показывает рецепты автора, на которого подписан, и пустеет после отписки', async () => {
        const author = await ctx.createUser();
        const reader = await ctx.createUser();
        const recipe = await ctx.createRecipe(author, { title: uniqueTitle('В ленте'), isPublished: true });

        // Без подписок лента пуста.
        const emptyFeed = await get('/users/me/feed', reader.token);
        expectStatus(emptyFeed, 200);
        assert.equal(emptyFeed.body.items.length, 0);

        const subscribe = await api(`/users/${author.id}/subscribe`, { method: 'POST', token: reader.token });
        expectStatus(subscribe, 200);

        const feed = await get('/users/me/feed', reader.token);
        expectStatus(feed, 200);
        assert.ok(feed.body.items.some((item: any) => item.id === recipe.id));

        const unsubscribe = await del(`/users/${author.id}/subscribe`, reader.token);
        expectStatus(unsubscribe, 204);

        const feedAfter = await get('/users/me/feed', reader.token);
        expectStatus(feedAfter, 200);
        assert.equal(feedAfter.body.items.length, 0);
    });
});
