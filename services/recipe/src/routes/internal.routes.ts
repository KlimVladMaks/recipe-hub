import { Router } from 'express';

import { BadRequestError } from '../errors.js';
import { RecipeService } from '../services/recipe.service.js';
import { DifficultySchema, PaginatedRecipesSchema } from '../schemas/recipe.schemas.js';

const internalRouter = Router();

function parseIdList(value: string | undefined): number[] {
    if (!value) return [];
    return value
        .split(',')
        .map(id => Number(id.trim()))
        .filter(id => Number.isInteger(id) && id > 0);
}

// Получить рецепты по списку authorId (для feed)
internalRouter.get('/internal/recipes/by-authors', async (req, res) => {
    const {
        authorIds: authorIdsStr,
        page: pageStr = '1',
        limit: limitStr = '20',
        search = '',
        dishTypeIds: dishTypeIdsStr = '',
        ingredientIds: ingredientIdsStr = '',
        difficulty = '',
    } = req.query as Record<string, string>;

    if (!authorIdsStr) {
        throw new BadRequestError('Параметр authorIds обязателен');
    }

    const authorIds = parseIdList(authorIdsStr);
    const page = Number(pageStr);
    const limit = Number(limitStr);
    const difficultyParsed = DifficultySchema.safeParse(difficulty);

    const recipes = await RecipeService.getRecipesByAuthorIds(
        authorIds,
        page,
        limit,
        search,
        parseIdList(dishTypeIdsStr),
        parseIdList(ingredientIdsStr),
        difficultyParsed.success ? difficultyParsed.data : undefined
    );

    res.status(200).json(PaginatedRecipesSchema.parse(recipes));
});

export default internalRouter;
