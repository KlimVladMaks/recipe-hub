import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { RecipeService } from '../services/recipe.service.js';
import {
  RecipeReadSchema, RecipeReadListSchema, RecipeRatingReadSchema, IsRecipeSavedReadSchema,
  StepReadSchema, StepReadListSchema,
  type RecipeCreateType, type RecipeUpdateType, type RecipeRatingPutType,
  type StepCreateType, type StepUpdateType,
} from '../schemas/index.js';

export class RecipeController {
  private static parseQueryParams(req: AuthRequest) {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const search = (req.query.search as string) || '';
    const dishTypeIds = (req.query.dishTypeIds as string || '').split(',').filter(Boolean).map(id => parseInt(id.trim()));
    const ingredientIds = (req.query.ingredientIds as string || '').split(',').filter(Boolean).map(id => parseInt(id.trim()));
    const difficulty = (req.query.difficulty as string) || '';
    return { page, limit, search, dishTypeIds, ingredientIds, difficulty };
  }

  static async getCurrentUserRecipes(req: AuthRequest, res: Response) {
    try {
      const q = RecipeController.parseQueryParams(req);
      const recipes = await RecipeService.getUserRecipes(req.currentUserId!, q.page, q.limit, q.search, q.dishTypeIds, q.ingredientIds, true, q.difficulty);
      res.json(RecipeReadListSchema.parse(recipes));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getCurrentUserSavedRecipes(req: AuthRequest, res: Response) {
    try {
      const q = RecipeController.parseQueryParams(req);
      const recipes = await RecipeService.getUserSavedRecipes(req.currentUserId!, q.page, q.limit, q.search, q.dishTypeIds, q.ingredientIds, q.difficulty);
      res.json(RecipeReadListSchema.parse(recipes));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getUserRecipes(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      const q = RecipeController.parseQueryParams(req);
      const recipes = await RecipeService.getUserRecipes(userId, q.page, q.limit, q.search, q.dishTypeIds, q.ingredientIds, false, q.difficulty);
      res.json(RecipeReadListSchema.parse(recipes));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getUserSavedRecipes(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      const q = RecipeController.parseQueryParams(req);
      const recipes = await RecipeService.getUserSavedRecipes(userId, q.page, q.limit, q.search, q.dishTypeIds, q.ingredientIds, q.difficulty);
      res.json(RecipeReadListSchema.parse(recipes));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getRecipes(req: AuthRequest, res: Response) {
    try {
      const q = RecipeController.parseQueryParams(req);
      const recipes = await RecipeService.getRecipes(q.page, q.limit, q.search, q.dishTypeIds, q.ingredientIds, q.difficulty);
      res.json(RecipeReadListSchema.parse(recipes));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async addRecipe(req: AuthRequest, res: Response) {
    try {
      const data: RecipeCreateType = req.body;
      const recipe = await RecipeService.addRecipe(req.currentUserId!, data);
      res.status(201).json(RecipeReadSchema.parse(recipe));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getRecipe(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const recipe = await RecipeService.getRecipe(recipeId);
      res.json(RecipeReadSchema.parse(recipe));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async updateRecipe(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const data: RecipeUpdateType = req.body;
      const recipe = await RecipeService.updateRecipe(recipeId, data);
      res.json(RecipeReadSchema.parse(recipe));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async deleteRecipe(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      await RecipeService.deleteRecipe(recipeId);
      res.status(204).send();
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getRecipeRating(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const rating = await RecipeService.getRecipeRating(recipeId, req.currentUserId!);
      res.json(RecipeRatingReadSchema.parse(rating));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async putRecipeRating(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const data: RecipeRatingPutType = req.body;
      const rating = await RecipeService.putRecipeRating(recipeId, data, req.currentUserId!);
      res.json(RecipeRatingReadSchema.parse(rating));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async deleteRecipeRating(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      await RecipeService.deleteRecipeRating(recipeId, req.currentUserId!);
      res.status(204).send();
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async isRecipeSaved(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const result = await RecipeService.isRecipeSaved(recipeId, req.currentUserId!);
      res.json(IsRecipeSavedReadSchema.parse(result));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async saveRecipe(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      await RecipeService.saveRecipe(recipeId, req.currentUserId!);
      res.status(200).send();
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async unsaveRecipe(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      await RecipeService.unsaveRecipe(recipeId, req.currentUserId!);
      res.status(200).send();
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  // Steps
  static async getSteps(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const steps = await RecipeService.getSteps(recipeId);
      res.json(StepReadListSchema.parse(steps));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async addStep(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const data: StepCreateType = req.body;
      const step = await RecipeService.addStep(recipeId, data);
      res.status(201).json(StepReadSchema.parse(step));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getStep(req: AuthRequest, res: Response) {
    try {
      const stepId = parseInt(req.params.stepId);
      const step = await RecipeService.getStep(stepId);
      res.json(StepReadSchema.parse(step));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async updateStep(req: AuthRequest, res: Response) {
    try {
      const stepId = parseInt(req.params.stepId);
      const data: StepUpdateType = req.body;
      const step = await RecipeService.updateStep(stepId, data);
      res.json(StepReadSchema.parse(step));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async deleteStep(req: AuthRequest, res: Response) {
    try {
      const stepId = parseInt(req.params.stepId);
      await RecipeService.deleteStep(stepId);
      res.status(204).send();
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }
}