/**
 * Базовые сценарии работы с рецептами: создание, чтение, обновление,
 * поиск/фильтрация, черновики, права и удаление.
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

describe('Recipes', () => {
    it('создаёт опубликованный рецепт и подставляет автора', async () => {
        const author = await ctx.createUser();
        const title = uniqueTitle('Борщ');

        const recipe = await ctx.createRecipe(author, {
            title,
            description: 'Классический борщ',
            difficulty: 'medium',
            isPublished: true,
            media: [
                { sortOrder: 0, mediaType: 'photo', mediaUrl: 'https://example.com/borsch.jpg' },
            ],
        });

        assert.equal(recipe.title, title);
        assert.equal(recipe.isPublished, true);
        assert.equal(recipe.difficulty, 'medium');
        assert.equal(recipe.author.id, author.id);
        assert.equal(recipe.media.length, 1);
    });

    it('читает созданный рецепт по id', async () => {
        const author = await ctx.createUser();
        const created = await ctx.createRecipe(author, { title: uniqueTitle('Паста'), isPublished: true });

        const response = await get(`/recipes/${created.id}`, author.token);
        expectStatus(response, 200);
        assert.equal(response.body.id, created.id);
        assert.equal(response.body.title, created.title);
    });

    it('обновляет рецепт (автор)', async () => {
        const author = await ctx.createUser();
        const created = await ctx.createRecipe(author, { title: uniqueTitle('Суп'), isPublished: true });

        const response = await patch(
            `/recipes/${created.id}`,
            { title: `${created.title} v2`, difficulty: 'hard' },
            author.token
        );
        expectStatus(response, 200);
        assert.equal(response.body.difficulty, 'hard');
        assert.match(response.body.title, /v2$/);
    });

    it('не позволяет обновлять чужой рецепт (403)', async () => {
        const author = await ctx.createUser();
        const stranger = await ctx.createUser();
        const created = await ctx.createRecipe(author, { title: uniqueTitle('Чужой'), isPublished: true });

        const response = await patch(`/recipes/${created.id}`, { title: 'Взлом' }, stranger.token);
        expectStatus(response, 403);
    });

    it('находит рецепт через поиск и фильтр по сложности', async () => {
        const author = await ctx.createUser();
        const title = uniqueTitle('УникРецепт');
        const created = await ctx.createRecipe(author, {
            title,
            difficulty: 'easy',
            isPublished: true,
        });

        const bySearch = await get(`/recipes?search=${encodeURIComponent(title)}`, author.token);
        expectStatus(bySearch, 200);
        assert.ok(bySearch.body.items.some((recipe: any) => recipe.id === created.id));

        const byDifficulty = await get(
            `/recipes?search=${encodeURIComponent(title)}&difficulty=easy`,
            author.token
        );
        expectStatus(byDifficulty, 200);
        assert.ok(byDifficulty.body.items.some((recipe: any) => recipe.id === created.id));

        const byWrongDifficulty = await get(
            `/recipes?search=${encodeURIComponent(title)}&difficulty=hard`,
            author.token
        );
        expectStatus(byWrongDifficulty, 200);
        assert.equal(byWrongDifficulty.body.items.length, 0);
    });

    it('черновик виден автору и скрыт от остальных', async () => {
        const author = await ctx.createUser();
        const stranger = await ctx.createUser();
        const title = uniqueTitle('Черновик');
        const draft = await ctx.createRecipe(author, { title, isPublished: false });

        // В личном кабинете автора черновик присутствует.
        const mine = await get(`/users/me/recipes?search=${encodeURIComponent(title)}`, author.token);
        expectStatus(mine, 200);
        assert.ok(mine.body.items.some((recipe: any) => recipe.id === draft.id));

        // Автор может открыть свой черновик.
        const authorView = await get(`/recipes/${draft.id}`, author.token);
        expectStatus(authorView, 200);

        // Посторонний — нет.
        const strangerView = await get(`/recipes/${draft.id}`, stranger.token);
        expectStatus(strangerView, 404);

        // В публичном поиске черновика нет.
        const publicSearch = await get(`/recipes?search=${encodeURIComponent(title)}`, stranger.token);
        expectStatus(publicSearch, 200);
        assert.equal(publicSearch.body.items.length, 0);
    });

    it('удаляет рецепт (автор) и он становится недоступен', async () => {
        const author = await ctx.createUser();
        const created = await ctx.createRecipe(author, { title: uniqueTitle('Удаляемый'), isPublished: true });

        const remove = await del(`/recipes/${created.id}`, author.token);
        expectStatus(remove, 204);

        const afterDelete = await get(`/recipes/${created.id}`, author.token);
        expectStatus(afterDelete, 404);
    });

    it('запрещает удалять чужой рецепт (403)', async () => {
        const author = await ctx.createUser();
        const stranger = await ctx.createUser();
        const created = await ctx.createRecipe(author, { title: uniqueTitle('Защищённый'), isPublished: true });

        const response = await api(`/recipes/${created.id}`, { method: 'DELETE', token: stranger.token });
        expectStatus(response, 403);

        // Рецепт на месте.
        const stillThere = await get(`/recipes/${created.id}`, author.token);
        expectStatus(stillThere, 200);
    });

    it('справочники типов блюд и ингредиентов возвращают пагинацию', async () => {
        const user = await ctx.createUser();

        const dishTypes = await get('/dish-types', user.token);
        expectStatus(dishTypes, 200);
        assert.ok(Array.isArray(dishTypes.body.items));

        const ingredients = await get('/ingredients', user.token);
        expectStatus(ingredients, 200);
        assert.ok(Array.isArray(ingredients.body.items));
    });

    it('обычный пользователь не может создавать типы блюд (403)', async () => {
        const user = await ctx.createUser();
        const response = await api('/dish-types', {
            method: 'POST',
            token: user.token,
            body: { title: uniqueTitle('Тип') },
        });
        expectStatus(response, 403);
    });
});
