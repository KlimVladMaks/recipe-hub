import type { Difficulty, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";


export class RecipeService {
    /**
     * Возвращает список рецептов пользователя.
     */
    static async getUserRecipes(
        userId: number,
        page: number,
        limit: number,
        search: string,
        dishTypeIds: Array<number>,
        ingredientIds: Array<number>,
        difficulty: Difficulty
    ) {
        
    };

    static async getUserSavedRecipes(
        userId,
        page,
        limit,
        search,
        dishTypeIds,
        ingredientIds,
        difficulty
    ) {};

    /**
     * Возвращает список всех рецептов с поддержкой пагинации, фильтрации и поиска.
     */
    static async getRecipes(
        page: number = 1,
        limit: number = 10,
        search: string = '',
        dishTypeIds: Array<number> = [],
        ingredientIds: Array<number> = [],
        difficulty?: Difficulty
    ) {
        const skip = (page - 1) * limit;
        const where: Prisma.RecipeWhereInput = {};
        where.isPublished = true;
        if (search && search.trim()) {
            where.title = {
                contains: search,
                mode: 'insensitive'
            };
        };
        if (difficulty) {
            where.difficulty = difficulty;
        };
        if (dishTypeIds.length > 0) {
            where.recipeDishTypes = {
                some: {
                    dishTypeId: { in: dishTypeIds }
                }
            };
        };
        if (ingredientIds.length > 0) {
            where.recipeIngredients = {
                some: {
                    ingredientId: { in: ingredientIds }
                }
            }
        }
        const recipes = await prisma.recipe.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                author: true,
                recipeDishTypes: {
                    include: {
                        dishType: true
                    }
                },
                recipeIngredients: {
                    include: {
                        ingredient: true
                    }
                },
                media: true
            }
        });
        return recipes;
    };

    static async addRecipe(userId, recipeCreateData) {};

    static async getRecipe(recipeId) {};

    static async updateRecipe(recipeId, recipeUpdateData) {};

    static async deleteRecipe(recipeId) {};

    static async getRecipeRating(recipeId) {};

    static async putRecipeRating(recipeId, recipeRatingPutData) {};

    static async deleteRecipeRating(recipeId, userId) {};

    static async isRecipeSaved(recipeId, userId) {};

    static async saveRecipe(recipeId, userId) {};

    static async unsaveRecipe(recipeId, userId) {};
};
