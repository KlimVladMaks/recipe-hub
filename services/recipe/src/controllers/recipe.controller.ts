import type { Response, NextFunction } from 'express'
import type { Difficulty } from '../generated/prisma/client';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { BadRequestError, ForbiddenError, parseId, parseLimit, parsePage } from '../errors.js';
import { RecipeService } from '../services/recipe.service.js';
import {
    DifficultySchema,
    IsRecipeSavedReadSchema,
    PaginatedRecipesSchema,
    RecipeRatingReadSchema,
    RecipeReadSchema,
    type RecipeCreateType,
    type RecipeRatingPutType,
    type RecipeUpdateType,
} from '../schemas/recipe.schemas.js';
import { isAdmin } from '../services/userServiceClient.js';

function parseIdList(value: unknown): number[] {
    if (typeof value !== 'string' || value.trim() === '') return [];
    return value
        .split(',')
        .map(id => Number(id.trim()))
        .filter(id => Number.isInteger(id) && id > 0);
}

function parseDifficulty(value: unknown): Difficulty | undefined {
    if (typeof value !== 'string' || value.trim() === '') return undefined;
    const parsed = DifficultySchema.safeParse(value);
    if (!parsed.success) {
        throw new BadRequestError('Некорректный параметр difficulty');
    }
    return parsed.data;
}


export class RecipeController {
    private static parseQueryParams(req: AuthRequest) {
        return {
            page: parsePage(req.query.page),
            limit: parseLimit(req.query.limit),
            search: typeof req.query.search === 'string' ? req.query.search : '',
            dishTypeIds: parseIdList(req.query.dishTypeIds),
            ingredientIds: parseIdList(req.query.ingredientIds),
            difficulty: parseDifficulty(req.query.difficulty),
        };
    };

    static async getCurrentUserRecipes(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const { page, limit, search, dishTypeIds, ingredientIds, difficulty } = RecipeController.parseQueryParams(req);
        const recipes = await RecipeService.getUserRecipes(
            currentUserId,
            page,
            limit,
            search,
            dishTypeIds,
            ingredientIds,
            true,
            difficulty
        );
        res.status(200).json(PaginatedRecipesSchema.parse(recipes));
    };

    static async getCurrentUserSavedRecipes(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const { page, limit, search, dishTypeIds, ingredientIds, difficulty } = RecipeController.parseQueryParams(req);
        const recipes = await RecipeService.getUserSavedRecipes(
            currentUserId,
            page,
            limit,
            search,
            dishTypeIds,
            ingredientIds,
            difficulty,
        );
        res.status(200).json(PaginatedRecipesSchema.parse(recipes));
    };

    static async getUserRecipes(req: AuthRequest, res: Response) {
        const userId = parseId(req.params.userId, 'userId');
        const { page, limit, search, dishTypeIds, ingredientIds, difficulty } = RecipeController.parseQueryParams(req);
        const recipes = await RecipeService.getUserRecipes(
            userId,
            page,
            limit,
            search,
            dishTypeIds,
            ingredientIds,
            false,
            difficulty
        );
        res.status(200).json(PaginatedRecipesSchema.parse(recipes));
    };

    static async getUserSavedRecipes(req: AuthRequest, res: Response) {
        const userId = parseId(req.params.userId, 'userId');
        const { page, limit, search, dishTypeIds, ingredientIds, difficulty } = RecipeController.parseQueryParams(req);
        const recipes = await RecipeService.getUserSavedRecipes(
            userId,
            page,
            limit,
            search,
            dishTypeIds,
            ingredientIds,
            difficulty
        );
        res.status(200).json(PaginatedRecipesSchema.parse(recipes));
    };

    static async getRecipes(req: AuthRequest, res: Response) {
        const { page, limit, search, dishTypeIds, ingredientIds, difficulty } = RecipeController.parseQueryParams(req);
        const recipes = await RecipeService.getRecipes(
            page,
            limit,
            search,
            dishTypeIds,
            ingredientIds,
            difficulty
        );
        res.status(200).json(PaginatedRecipesSchema.parse(recipes));
    };

    static async addRecipe(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const recipeCreateData: RecipeCreateType = req.body;
        const recipe = await RecipeService.addRecipe(currentUserId, recipeCreateData);
        res.status(201).json(RecipeReadSchema.parse(recipe));
    };

    static async getRecipe(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const isAuthor = await RecipeService.isUserRecipeAuthor(currentUserId, recipeId);
        const recipe = await RecipeService.getRecipe(recipeId, { includeUnpublished: isAuthor });
        res.status(200).json(RecipeReadSchema.parse(recipe));
    };

    static async updateRecipe(req: AuthRequest, res: Response) {
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const recipeUpdateData: RecipeUpdateType = req.body;
        const recipe = await RecipeService.updateRecipe(recipeId, recipeUpdateData);
        res.status(200).json(RecipeReadSchema.parse(recipe));
    };

    static async deleteRecipe(req: AuthRequest, res: Response) {
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        await RecipeService.deleteRecipe(recipeId);
        res.status(204).send();
    };

    static async getRecipeRating(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const recipeRating = await RecipeService.getRecipeRating(recipeId, currentUserId);
        res.status(200).json(RecipeRatingReadSchema.parse(recipeRating));
    };

    static async putRecipeRating(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const recipeRatingPutData: RecipeRatingPutType = req.body;
        const recipeRating = await RecipeService.putRecipeRating(recipeId, recipeRatingPutData, currentUserId);
        res.status(200).json(RecipeRatingReadSchema.parse(recipeRating));
    };

    static async deleteRecipeRating(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        await RecipeService.deleteRecipeRating(recipeId, currentUserId);
        res.status(204).send();
    };

    static async isRecipeSaved(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const isRecipeSaved = await RecipeService.isRecipeSaved(recipeId, currentUserId);
        res.status(200).json(IsRecipeSavedReadSchema.parse(isRecipeSaved));
    };

    static async saveRecipe(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        await RecipeService.saveRecipe(recipeId, currentUserId);
        res.status(200).send();
    };

    static async unsaveRecipe(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        await RecipeService.unsaveRecipe(recipeId, currentUserId);
        res.status(200).send();
    };

    // Middleware для проверки автора рецепта
    static async isRecipeAuthor(req: AuthRequest, _res: Response, next: NextFunction) {
        const currentUserId = req.currentUserId!;
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const isAuthor = await RecipeService.isUserRecipeAuthor(currentUserId, recipeId);
        if (!isAuthor) {
            next(new ForbiddenError('Доступ только для автора рецепта'));
            return;
        }
        next();
    };

    // Middleware для проверки автора рецепта или администратора
    static async isRecipeAuthorOrAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
        const currentUserId = req.currentUserId!;
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const [isAuthor, userIsAdmin] = await Promise.all([
            RecipeService.isUserRecipeAuthor(currentUserId, recipeId),
            isAdmin(currentUserId),
        ]);
        if (!(isAuthor || userIsAdmin)) {
            next(new ForbiddenError('Доступ только для автора рецепта и администраторов'));
            return;
        }
        next();
    };
}
