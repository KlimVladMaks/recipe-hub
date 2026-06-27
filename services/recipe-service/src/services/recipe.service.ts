import { Difficulty, MediaType, type Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import type { RecipeCreateType, RecipeUpdateType, RecipeRatingPutType, StepCreateType, StepUpdateType } from '../schemas/index.js';

export class RecipeService {
  static async getUserRecipes(
    userId: number, page = 1, limit = 10, search = '',
    dishTypeIds: number[] = [], ingredientIds: number[] = [],
    includeUnpublished = false, difficulty?: string,
  ) {
    const where: Prisma.RecipeWhereInput = { authorId: userId };
    if (!includeUnpublished) where.isPublished = true;
    if (search.trim()) where.title = { contains: search, mode: 'insensitive' };
    if (difficulty) where.difficulty = difficulty as Difficulty;
    if (dishTypeIds.length > 0) where.recipeDishTypes = { some: { dishTypeId: { in: dishTypeIds } } };
    if (ingredientIds.length > 0) where.recipeIngredients = { some: { ingredientId: { in: ingredientIds } } };

    const recipes = await prisma.recipe.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
      include: { recipeDishTypes: { include: { dishType: true } }, recipeIngredients: { include: { ingredient: true } }, media: true },
    });
    return this.transformRecipes(recipes);
  }

  static async getUserSavedRecipes(
    userId: number, page = 1, limit = 10, search = '',
    dishTypeIds: number[] = [], ingredientIds: number[] = [], difficulty?: string,
  ) {
    const where: Prisma.SavedRecipeWhereInput = { userId };
    const recipeFilter: any = { isPublished: true };
    if (search.trim()) recipeFilter.title = { contains: search, mode: 'insensitive' };
    if (difficulty) recipeFilter.difficulty = difficulty as Difficulty;
    if (dishTypeIds.length > 0) recipeFilter.recipeDishTypes = { some: { dishTypeId: { in: dishTypeIds } } };
    if (ingredientIds.length > 0) recipeFilter.recipeIngredients = { some: { ingredientId: { in: ingredientIds } } };
    where.recipe = recipeFilter;

    const saved = await prisma.savedRecipe.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { savedAt: 'desc' },
      include: { recipe: { include: { recipeDishTypes: { include: { dishType: true } }, recipeIngredients: { include: { ingredient: true } }, media: true } } },
    });
    return saved.map(s => this.transformRecipe(s.recipe));
  }

  static async getRecipes(page = 1, limit = 10, search = '', dishTypeIds: number[] = [], ingredientIds: number[] = [], difficulty?: string) {
    const where: Prisma.RecipeWhereInput = { isPublished: true };
    if (search.trim()) where.title = { contains: search, mode: 'insensitive' };
    if (difficulty) where.difficulty = difficulty as Difficulty;
    if (dishTypeIds.length > 0) where.recipeDishTypes = { some: { dishTypeId: { in: dishTypeIds } } };
    if (ingredientIds.length > 0) where.recipeIngredients = { some: { ingredientId: { in: ingredientIds } } };

    const recipes = await prisma.recipe.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
      include: { recipeDishTypes: { include: { dishType: true } }, recipeIngredients: { include: { ingredient: true } }, media: true },
    });
    return this.transformRecipes(recipes);
  }

  static async addRecipe(userId: number, data: RecipeCreateType) {
    const recipeData: any = { title: data.title, isPublished: data.isPublished, authorId: userId };
    if (data.description !== undefined) recipeData.description = data.description;
    if (data.difficulty) recipeData.difficulty = data.difficulty as Difficulty;

    if (data.dishTypeIds?.length) {
      recipeData.recipeDishTypes = { create: data.dishTypeIds.map(id => ({ dishTypeId: id })) };
    }
    if (data.ingredientIds?.length) {
      recipeData.recipeIngredients = { create: data.ingredientIds.map(id => ({ ingredientId: id })) };
    }
    if (data.media?.length) {
      recipeData.media = { create: data.media.map(m => ({ sortOrder: m.sortOrder, mediaType: m.mediaType as MediaType, mediaUrl: m.mediaUrl })) };
    }

    const recipe = await prisma.recipe.create({ data: recipeData });

    // Публикуем событие в RabbitMQ
    try {
      const { publishEvent } = await import('../config/rabbitmq.js');
      await publishEvent('recipe.created', {
        recipeId: recipe.id,
        authorId: userId,
        title: data.title,
        createdAt: recipe.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('Ошибка публикации события recipe.created:', error);
    }

    return this.getRecipe(recipe.id);
  }

  static async getRecipe(recipeId: number) {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { recipeDishTypes: { include: { dishType: true } }, recipeIngredients: { include: { ingredient: true } }, media: true },
    });
    if (!recipe) throw new Error('Recipe not found');
    return this.transformRecipe(recipe);
  }

  static async updateRecipe(recipeId: number, data: RecipeUpdateType) {
    const existing = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!existing) throw new Error('Recipe not found');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.difficulty) updateData.difficulty = data.difficulty as Difficulty;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.recipe.update({ where: { id: recipeId }, data: updateData });
      }
      if (data.dishTypeIds !== undefined) {
        await tx.recipeDishType.deleteMany({ where: { recipeId } });
        if (data.dishTypeIds.length > 0) {
          await tx.recipeDishType.createMany({ data: data.dishTypeIds.map(id => ({ dishTypeId: id, recipeId })) });
        }
      }
      if (data.ingredientIds !== undefined) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId } });
        if (data.ingredientIds.length > 0) {
          await tx.recipeIngredient.createMany({ data: data.ingredientIds.map(id => ({ ingredientId: id, recipeId })) });
        }
      }
      if (data.media !== undefined) {
        await tx.recipeMedia.deleteMany({ where: { recipeId } });
        if (data.media.length > 0) {
          await tx.recipeMedia.createMany({ data: data.media.map(m => ({ recipeId, sortOrder: m.sortOrder ?? 0, mediaType: (m.mediaType ?? 'photo') as MediaType, mediaUrl: m.mediaUrl ?? '' })) });
        }
      }
    });
    return this.getRecipe(recipeId);
  }

  static async deleteRecipe(recipeId: number) {
    await prisma.recipe.delete({ where: { id: recipeId } });
  }

  static async getRecipeRating(recipeId: number, userId: number) {
    const avg = await prisma.recipeRating.aggregate({ where: { recipeId }, _avg: { rating: true } });
    const userRating = await prisma.recipeRating.findUnique({ where: { userId_recipeId: { userId, recipeId } }, select: { rating: true } });
    return { avg_rating: avg._avg.rating ?? null, rating_by_user: userRating?.rating ?? null };
  }

  static async putRecipeRating(recipeId: number, data: RecipeRatingPutType, userId: number) {
    await prisma.recipeRating.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      update: { rating: data.rating, ratedAt: new Date() },
      create: { userId, recipeId, rating: data.rating },
    });
    return this.getRecipeRating(recipeId, userId);
  }

  static async deleteRecipeRating(recipeId: number, userId: number) {
    await prisma.recipeRating.deleteMany({ where: { userId, recipeId } });
  }

  static async isRecipeSaved(recipeId: number, userId: number) {
    const saved = await prisma.savedRecipe.findUnique({ where: { userId_recipeId: { userId, recipeId } } });
    return { isSaved: saved !== null };
  }

  static async saveRecipe(recipeId: number, userId: number) {
    await prisma.savedRecipe.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      update: {}, create: { userId, recipeId },
    });
  }

  static async unsaveRecipe(recipeId: number, userId: number) {
    await prisma.savedRecipe.deleteMany({ where: { userId, recipeId } });
  }

  static async isUserRecipeAuthor(userId: number, recipeId: number) {
    const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, authorId: userId }, select: { id: true } });
    return recipe !== null;
  }

  // Steps
  static async getSteps(recipeId: number) {
    const steps = await prisma.recipeStep.findMany({
      where: { recipeId }, orderBy: { number: 'asc' },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    });
    return steps.map(s => ({ ...s, media: s.media.map(m => ({ ...m })) }));
  }

  static async addStep(recipeId: number, data: StepCreateType) {
    const step = await prisma.$transaction(async (tx) => {
      const s = await tx.recipeStep.create({ data: { recipeId, number: data.number, title: data.title, description: data.description ?? null } });
      if (data.media?.length) {
        await tx.recipeStepMedia.createMany({ data: data.media.map((m, i) => ({ recipeStepId: s.id, sortOrder: m.sortOrder ?? i, mediaType: m.mediaType as MediaType, mediaUrl: m.mediaUrl })) });
      }
      return tx.recipeStep.findUnique({ where: { id: s.id }, include: { media: { orderBy: { sortOrder: 'asc' } } } });
    });
    if (!step) throw new Error('Не удалось создать шаг');
    return { ...step, media: step.media.map(m => ({ ...m })) };
  }

  static async getStep(stepId: number) {
    const step = await prisma.recipeStep.findUnique({ where: { id: stepId }, include: { media: { orderBy: { sortOrder: 'asc' } } } });
    if (!step) throw new Error('Шаг не найден');
    return { ...step, media: step.media.map(m => ({ ...m })) };
  }

  static async updateStep(stepId: number, data: StepUpdateType) {
    const updateData: any = {};
    if (data.number !== undefined) updateData.number = data.number;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    const step = await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.recipeStep.update({ where: { id: stepId }, data: updateData });
      }
      if (data.media !== undefined) {
        await tx.recipeStepMedia.deleteMany({ where: { recipeStepId: stepId } });
        if (data.media.length > 0) {
          await tx.recipeStepMedia.createMany({ data: data.media.map((m, i) => ({ recipeStepId: stepId, sortOrder: m.sortOrder ?? i, mediaType: (m.mediaType ?? 'photo') as MediaType, mediaUrl: m.mediaUrl ?? '' })) });
        }
      }
      return tx.recipeStep.findUnique({ where: { id: stepId }, include: { media: { orderBy: { sortOrder: 'asc' } } } });
    });
    if (!step) throw new Error('Шаг не найден');
    return { ...step, media: step.media.map(m => ({ ...m })) };
  }

  static async deleteStep(stepId: number) {
    await prisma.recipeStep.delete({ where: { id: stepId } });
  }

  static async isCorrectStepId(stepId: number, recipeId: number) {
    const count = await prisma.recipeStep.count({ where: { id: stepId, recipeId } });
    return count > 0;
  }

  // Helpers
  private static async fetchUser(userId: number) {
    const host = process.env.AUTH_SERVICE_HOST || 'auth-service';
    const port = process.env.AUTH_SERVICE_PORT || '3001';
    try {
      const res = await fetch(`http://${host}:${port}/api/internal/users/${userId}`);
      if (res.ok) return res.json();
    } catch {}
    return { id: userId, username: 'unknown', firstName: '', lastName: '', about: null, role: 'user', createdAt: new Date(), updatedAt: new Date() };
  }

  private static transformRecipe(recipe: any) {
    return {
      id: recipe.id, title: recipe.title,
      dishTypes: recipe.recipeDishTypes?.map((rdt: any) => ({ id: rdt.dishType.id, title: rdt.dishType.title })) || [],
      ingredients: recipe.recipeIngredients?.map((ri: any) => ({ id: ri.ingredient.id, title: ri.ingredient.title })) || [],
      description: recipe.description,
      media: recipe.media?.map((m: any) => ({ id: m.id, sortOrder: m.sortOrder, mediaType: m.mediaType, mediaUrl: m.mediaUrl, createdAt: m.createdAt, updatedAt: m.updatedAt })) || [],
      difficulty: recipe.difficulty, createdAt: recipe.createdAt, updatedAt: recipe.updatedAt,
      isPublished: recipe.isPublished,
      author: { id: recipe.authorId, username: '', firstName: '', lastName: '', about: null, role: 'user', createdAt: new Date(), updatedAt: new Date() },
    };
  }

  private static transformRecipes(recipes: any[]) {
    return recipes.map(r => this.transformRecipe(r));
  }
}