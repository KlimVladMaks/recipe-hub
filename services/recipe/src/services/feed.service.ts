import type { Difficulty, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { config } from "../config/index.js";


export class FeedService {
    static async getFeed(
        userId: number,
        page: number = 1,
        limit: number = 10,
        search: string = '',
        dishTypeIds: Array<number> = [],
        ingredientIds: Array<number> = [],
        difficulty?: Difficulty
    ) {
        // Получаем ID авторов, на которых подписан пользователь, из user-service
        const authorIds = await FeedService.getSubscribedAuthorIds(userId);

        if (authorIds.length === 0) {
            return [];
        }

        const skip = (page - 1) * limit;
        const where: Prisma.RecipeWhereInput = {
            isPublished: true,
            authorId: { in: authorIds },
        };

        if (search && search.trim()) {
            where.title = { contains: search, mode: 'insensitive' };
        }
        if (difficulty) {
            where.difficulty = difficulty;
        }
        if (dishTypeIds.length > 0) {
            where.recipeDishTypes = {
                some: { dishTypeId: { in: dishTypeIds } },
            };
        }
        if (ingredientIds.length > 0) {
            where.recipeIngredients = {
                some: { ingredientId: { in: ingredientIds } },
            };
        }

        const recipes = await prisma.recipe.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                author: true,
                recipeDishTypes: {
                    include: { dishType: true },
                },
                recipeIngredients: {
                    include: { ingredient: true },
                },
                media: true,
            },
        });

        return recipes.map(recipe => ({
            id: recipe.id,
            title: recipe.title,
            dishTypes: recipe.recipeDishTypes.map(rdt => ({
                id: rdt.dishType.id,
                title: rdt.dishType.title,
            })),
            ingredients: recipe.recipeIngredients.map(ri => ({
                id: ri.ingredient.id,
                title: ri.ingredient.title,
            })),
            description: recipe.description,
            media: recipe.media.map(media => ({
                id: media.id,
                sortOrder: media.sortOrder,
                mediaType: media.mediaType,
                mediaUrl: media.mediaUrl,
                createdAt: media.createdAt,
                updatedAt: media.updatedAt,
            })),
            difficulty: recipe.difficulty,
            createdAt: recipe.createdAt,
            updatedAt: recipe.updatedAt,
            isPublished: recipe.isPublished,
            author: {
                id: recipe.author.id,
                username: recipe.author.username,
                firstName: recipe.author.firstName,
                lastName: recipe.author.lastName,
                about: recipe.author.about,
                role: recipe.author.role,
                createdAt: recipe.author.createdAt,
                updatedAt: recipe.author.updatedAt,
            },
        }));
    }

    private static async getSubscribedAuthorIds(userId: number): Promise<number[]> {
        try {
            const response = await fetch(
                `${config.userServiceUrl}/api/users/me/subscribed-author-ids`,
                {
                    headers: {
                        'x-user-id': String(userId),
                    },
                }
            );
            if (!response.ok) {
                console.error(`Failed to fetch subscribed author IDs: ${response.status}`);
                return [];
            }
            const data = await response.json() as { authorIds: number[] };
            return data.authorIds;
        } catch (error) {
            console.error('Error fetching subscribed author IDs:', error);
            return [];
        }
    }
}