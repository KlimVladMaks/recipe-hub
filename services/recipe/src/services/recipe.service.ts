import { MediaType, type Difficulty, type Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database.js';
import { NotFoundError } from '../errors.js';
import type { RecipeCreateType, RecipeRatingPutType, RecipeUpdateType } from '../schemas/recipe.schemas.js';
import { getUser } from './userServiceClient.js';

const recipeInclude = {
    recipeDishTypes: { include: { dishType: true } },
    recipeIngredients: { include: { ingredient: true } },
    media: true,
} satisfies Prisma.RecipeInclude;

type RecipeWithRelations = Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>;
type RecipeAuthor = Awaited<ReturnType<typeof getUser>>;

interface RecipeFilter {
    search?: string;
    dishTypeIds?: number[];
    ingredientIds?: number[];
    difficulty?: Difficulty;
}

function serializeRecipe(recipe: RecipeWithRelations, author: RecipeAuthor) {
    return {
        id: recipe.id,
        title: recipe.title,
        dishTypes: recipe.recipeDishTypes.map(rdt => ({
            id: rdt.dishType.id,
            title: rdt.dishType.title
        })),
        ingredients: recipe.recipeIngredients.map(ri => ({
            id: ri.ingredient.id,
            title: ri.ingredient.title
        })),
        description: recipe.description,
        media: recipe.media.map(media => ({
            id: media.id,
            sortOrder: media.sortOrder,
            mediaType: media.mediaType,
            mediaUrl: media.mediaUrl,
            createdAt: media.createdAt,
            updatedAt: media.updatedAt
        })),
        difficulty: recipe.difficulty,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
        isPublished: recipe.isPublished,
        author
    };
}


export class RecipeService {
    private static buildFilter(filter: RecipeFilter): Prisma.RecipeWhereInput {
        const where: Prisma.RecipeWhereInput = {};

        if (filter.search && filter.search.trim()) {
            where.title = { contains: filter.search, mode: 'insensitive' };
        }
        if (filter.difficulty) {
            where.difficulty = filter.difficulty;
        }
        if (filter.dishTypeIds && filter.dishTypeIds.length > 0) {
            where.recipeDishTypes = { some: { dishTypeId: { in: filter.dishTypeIds } } };
        }
        if (filter.ingredientIds && filter.ingredientIds.length > 0) {
            where.recipeIngredients = { some: { ingredientId: { in: filter.ingredientIds } } };
        }

        return where;
    }

    private static async fetchAuthors(authorIds: number[]): Promise<Map<number, RecipeAuthor>> {
        const uniqueIds = [...new Set(authorIds)];
        const authors = await Promise.all(
            uniqueIds.map(id => getUser(id).catch(() => null))
        );
        return new Map(
            authors
                .filter((author): author is RecipeAuthor => author !== null)
                .map(author => [author.id, author])
        );
    }

    static async getUserRecipes(
        userId: number,
        page: number = 1,
        limit: number = 10,
        search: string = '',
        dishTypeIds: Array<number> = [],
        ingredientIds: Array<number> = [],
        includeUnpublished: boolean = false,
        difficulty?: Difficulty,
    ) {
        const skip = (page - 1) * limit;
        const where = RecipeService.buildFilter({ search, dishTypeIds, ingredientIds, difficulty });
        where.authorId = userId;
        if (!includeUnpublished) {
            where.isPublished = true;
        }

        const [recipes, total] = await Promise.all([
            prisma.recipe.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: recipeInclude
            }),
            prisma.recipe.count({ where }),
        ]);

        const authorMap = await RecipeService.fetchAuthors([userId]);

        return {
            items: recipes.map(recipe => serializeRecipe(recipe, authorMap.get(recipe.authorId)!)),
            total,
            page,
            limit
        };
    }

    static async getUserSavedRecipes(
        userId: number,
        page: number = 1,
        limit: number = 10,
        search: string = '',
        dishTypeIds: Array<number> = [],
        ingredientIds: Array<number> = [],
        difficulty?: Difficulty
    ) {
        const skip = (page - 1) * limit;
        const recipeWhere = RecipeService.buildFilter({ search, dishTypeIds, ingredientIds, difficulty });
        recipeWhere.isPublished = true;

        const where: Prisma.SavedRecipeWhereInput = { userId, recipe: recipeWhere };

        const [savedRecipes, total] = await Promise.all([
            prisma.savedRecipe.findMany({
                where,
                skip,
                take: limit,
                orderBy: { savedAt: 'desc' },
                include: { recipe: { include: recipeInclude } }
            }),
            prisma.savedRecipe.count({ where }),
        ]);

        const authorMap = await RecipeService.fetchAuthors(
            savedRecipes.map(savedRecipe => savedRecipe.recipe.authorId)
        );

        return {
            items: savedRecipes.map(savedRecipe =>
                serializeRecipe(savedRecipe.recipe, authorMap.get(savedRecipe.recipe.authorId)!)
            ),
            total,
            page,
            limit
        };
    }

    static async getRecipes(
        page: number = 1,
        limit: number = 10,
        search: string = '',
        dishTypeIds: Array<number> = [],
        ingredientIds: Array<number> = [],
        difficulty?: Difficulty
    ) {
        const skip = (page - 1) * limit;
        const where = RecipeService.buildFilter({ search, dishTypeIds, ingredientIds, difficulty });
        where.isPublished = true;

        const [recipes, total] = await Promise.all([
            prisma.recipe.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: recipeInclude
            }),
            prisma.recipe.count({ where }),
        ]);

        const authorMap = await RecipeService.fetchAuthors(recipes.map(recipe => recipe.authorId));

        return {
            items: recipes.map(recipe => serializeRecipe(recipe, authorMap.get(recipe.authorId)!)),
            total,
            page,
            limit
        };
    };

    static async addRecipe(userId: number, recipeCreateData: RecipeCreateType) {
        const { title, dishTypeIds, ingredientIds, description, media, difficulty, isPublished } = recipeCreateData;

        const recipeData: Prisma.RecipeCreateInput = {
            title,
            isPublished,
            authorId: userId,
        };

        if (description !== undefined) recipeData.description = description;
        if (difficulty !== undefined) recipeData.difficulty = difficulty;

        if (dishTypeIds && dishTypeIds.length > 0) {
            recipeData.recipeDishTypes = {
                create: dishTypeIds.map(dishTypeId => ({
                    dishType: { connect: { id: dishTypeId } }
                }))
            };
        }

        if (ingredientIds && ingredientIds.length > 0) {
            recipeData.recipeIngredients = {
                create: ingredientIds.map(ingredientId => ({
                    ingredient: { connect: { id: ingredientId } }
                }))
            };
        }

        if (media && media.length > 0) {
            recipeData.media = {
                create: media.map(m => ({
                    sortOrder: m.sortOrder,
                    mediaType: m.mediaType as MediaType,
                    mediaUrl: m.mediaUrl
                }))
            };
        }

        const recipe = await prisma.recipe.create({
            data: recipeData,
            include: recipeInclude
        });

        return await RecipeService.getRecipe(recipe.id, { includeUnpublished: true });
    };

    static async getRecipe(recipeId: number, options: { includeUnpublished?: boolean } = {}) {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            include: recipeInclude
        });

        if (!recipe || (!recipe.isPublished && !options.includeUnpublished)) {
            throw new NotFoundError('Рецепт не найден');
        }

        const author = await getUser(recipe.authorId);

        return serializeRecipe(recipe, author);
    };

    static async updateRecipe(recipeId: number, recipeUpdateData: RecipeUpdateType) {
        const { title, dishTypeIds, ingredientIds, description, media, difficulty, isPublished } = recipeUpdateData;

        const existingRecipe = await prisma.recipe.findUnique({
            where: { id: recipeId }
        });

        if (!existingRecipe) {
            throw new NotFoundError('Рецепт не найден');
        }

        const recipeData: Prisma.RecipeUpdateInput = {};

        if (title !== undefined) recipeData.title = title;
        if (description !== undefined) recipeData.description = description;
        if (difficulty !== undefined) recipeData.difficulty = difficulty;
        if (isPublished !== undefined) recipeData.isPublished = isPublished;

        await prisma.$transaction(async (tx) => {
            if (Object.keys(recipeData).length > 0) {
                await tx.recipe.update({
                    where: { id: recipeId },
                    data: recipeData
                });
            }

            if (dishTypeIds !== undefined) {
                await tx.recipeDishType.deleteMany({ where: { recipeId } });
                if (dishTypeIds.length > 0) {
                    await tx.recipeDishType.createMany({
                        data: dishTypeIds.map(dishTypeId => ({ dishTypeId, recipeId }))
                    });
                }
            }

            if (ingredientIds !== undefined) {
                await tx.recipeIngredient.deleteMany({ where: { recipeId } });
                if (ingredientIds.length > 0) {
                    await tx.recipeIngredient.createMany({
                        data: ingredientIds.map(ingredientId => ({ ingredientId, recipeId }))
                    });
                }
            }

            if (media !== undefined) {
                await tx.recipeMedia.deleteMany({ where: { recipeId } });
                if (media.length > 0) {
                    await tx.recipeMedia.createMany({
                        data: media.map(m => ({
                            recipeId,
                            sortOrder: m.sortOrder ?? 0,
                            mediaType: m.mediaType as MediaType,
                            mediaUrl: m.mediaUrl ?? ''
                        }))
                    });
                }
            }
        });

        return await RecipeService.getRecipe(recipeId, { includeUnpublished: true });
    };

    static async deleteRecipe(recipeId: number) {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { id: true }
        });
        if (!recipe) {
            throw new NotFoundError('Рецепт не найден');
        }
        await prisma.recipe.delete({
            where: { id: recipeId },
        });
    };

    static async getRecipeRating(recipeId: number, userId: number) {
        await RecipeService.ensureRecipeExists(recipeId);

        const [avgResult, userRatingRecord] = await Promise.all([
            prisma.recipeRating.aggregate({
                where: { recipeId },
                _avg: { rating: true },
            }),
            prisma.recipeRating.findUnique({
                where: {
                    userId_recipeId: { userId, recipeId },
                },
                select: { rating: true },
            }),
        ]);

        return {
            avgRating: avgResult._avg.rating ?? null,
            userRating: userRatingRecord?.rating ?? null,
        };
    };

    static async putRecipeRating(recipeId: number, recipeRatingPutData: RecipeRatingPutType, userId: number) {
        await RecipeService.ensureRecipeExists(recipeId);
        const { rating } = recipeRatingPutData;
        await prisma.recipeRating.upsert({
            where: {
                userId_recipeId: { userId, recipeId }
            },
            update: {
                rating: rating,
                ratedAt: new Date(),
            },
            create: {
                userId: userId,
                recipeId: recipeId,
                rating: rating,
            }
        });
        return await RecipeService.getRecipeRating(recipeId, userId);
    };

    static async deleteRecipeRating(recipeId: number, userId: number) {
        await prisma.recipeRating.deleteMany({
            where: {
                userId: userId,
                recipeId: recipeId,
            },
        });
    };

    static async isRecipeSaved(recipeId: number, userId: number) {
        const saved = await prisma.savedRecipe.findUnique({
            where: {
                userId_recipeId: { userId, recipeId }
            }
        });
        return { isSaved: saved !== null };
    };

    static async saveRecipe(recipeId: number, userId: number) {
        await RecipeService.ensureRecipeExists(recipeId);
        await prisma.savedRecipe.upsert({
            where: {
                userId_recipeId: { userId, recipeId },
            },
            update: {},
            create: {
                userId: userId,
                recipeId: recipeId,
            },
        });
    };

    static async unsaveRecipe(recipeId: number, userId: number) {
        await prisma.savedRecipe.deleteMany({
            where: {
                userId: userId,
                recipeId: recipeId,
            },
        });
    };

    static async isUserRecipeAuthor(userId: number, recipeId: number) {
        const recipe = await prisma.recipe.findFirst({
            where: {
                id: recipeId,
                authorId: userId,
            },
            select: {
                id: true,
            },
        });
        return recipe !== null;
    };

    // Внутренний метод для получения рецептов по списку authorId (для feed)
    static async getRecipesByAuthorIds(
        authorIds: number[],
        page: number = 1,
        limit: number = 10,
        search: string = '',
        dishTypeIds: Array<number> = [],
        ingredientIds: Array<number> = [],
        difficulty?: Difficulty
    ) {
        if (authorIds.length === 0) {
            return { items: [], total: 0, page, limit };
        }

        const skip = (page - 1) * limit;
        const where = RecipeService.buildFilter({ search, dishTypeIds, ingredientIds, difficulty });
        where.isPublished = true;
        where.authorId = { in: authorIds };

        const [recipes, total] = await Promise.all([
            prisma.recipe.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: recipeInclude,
            }),
            prisma.recipe.count({ where }),
        ]);

        const authorMap = await RecipeService.fetchAuthors(recipes.map(recipe => recipe.authorId));

        return {
            items: recipes.map(recipe => serializeRecipe(recipe, authorMap.get(recipe.authorId)!)),
            total,
            page,
            limit
        };
    };

    private static async ensureRecipeExists(recipeId: number) {
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { id: true }
        });
        if (!recipe) {
            throw new NotFoundError('Рецепт не найден');
        }
    }
};
