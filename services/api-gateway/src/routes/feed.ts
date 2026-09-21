import { Router, Request, Response } from 'express';
import { config } from '../config';

export const feedRouter = Router();

feedRouter.get('/', async (req: Request, res: Response) => {
    const currentUserId = req.headers[config.xUserId];
    if (!currentUserId) {
        res.status(401).json({ error: 'Не удалось определить пользователя' });
        return;
    }

    const page = String(req.query.page ?? '1');
    const limit = String(req.query.limit ?? '20');
    const search = String(req.query.search ?? '');
    const dishTypeIds = String(req.query.dishTypeIds ?? '');
    const ingredientIds = String(req.query.ingredientIds ?? '');
    const difficulty = String(req.query.difficulty ?? '');

    // 1. Получаем ID авторов, на которых подписан пользователь, из user-service
    const userServiceUrl = config.service_urls.user;
    const subscriptionResponse = await fetch(
        `${userServiceUrl}/api/internal/users/${currentUserId}/subscription-ids`
    );

    if (!subscriptionResponse.ok) {
        res.status(502).json({ error: 'Не удалось получить подписки из user-service' });
        return;
    }

    const subscriptionData = await subscriptionResponse.json() as { authorIds?: number[] };
    const authorIds = subscriptionData.authorIds ?? [];

    if (authorIds.length === 0) {
        res.status(200).json({ items: [], total: 0, page: Number(page), limit: Number(limit) });
        return;
    }

    // 2. Получаем рецепты от этих авторов из recipe-service
    const recipeServiceUrl = config.service_urls.recipe;
    const authorIdsParam = authorIds.join(',');
    const recipeResponse = await fetch(
        `${recipeServiceUrl}/api/internal/recipes/by-authors?authorIds=${authorIdsParam}` +
        `&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}` +
        `&dishTypeIds=${dishTypeIds}&ingredientIds=${ingredientIds}&difficulty=${difficulty}`
    );

    if (!recipeResponse.ok) {
        res.status(502).json({ error: 'Не удалось получить рецепты из recipe-service' });
        return;
    }

    const recipes = await recipeResponse.json();
    res.status(200).json(recipes);
});
