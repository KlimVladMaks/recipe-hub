import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { DirectoryService } from '../services/directory.service.js';
import {
  DishTypeReadSchema,
  DishTypeReadListSchema,
  DishTypeUpdateSchema,
  IngredientReadSchema,
  IngredientReadListSchema,
  type DishTypeCreateType,
  type DishTypeUpdateType,
  type IngredientCreateType,
  type IngredientUpdateType,
} from '../schemas/index.js';

export class DirectoryController {
  static async getDishTypes(req: AuthRequest, res: Response) {
    try {
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '20');
      const search = (req.query.search as string) || '';
      const items = await DirectoryService.getDishTypes(search, page, limit);
      res.json(DishTypeReadListSchema.parse(items));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async addDishType(req: AuthRequest, res: Response) {
    try {
      const data: DishTypeCreateType = req.body;
      const item = await DirectoryService.createDishType(data);
      res.status(201).json(DishTypeReadSchema.parse(item));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getDishType(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.dishTypeId);
      const item = await DirectoryService.getDishType(id);
      res.json(DishTypeReadSchema.parse(item));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateDishType(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.dishTypeId);
      const data: DishTypeUpdateType = req.body;
      const item = await DirectoryService.updateDishType(id, data);
      res.json(DishTypeUpdateSchema.parse(item));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteDishType(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.dishTypeId);
      await DirectoryService.deleteDishType(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getIngredients(req: AuthRequest, res: Response) {
    try {
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '20');
      const search = (req.query.search as string) || '';
      const items = await DirectoryService.getIngredients(search, page, limit);
      res.json(IngredientReadListSchema.parse(items));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async addIngredient(req: AuthRequest, res: Response) {
    try {
      const data: IngredientCreateType = req.body;
      const item = await DirectoryService.createIngredient(data);
      res.status(201).json(IngredientReadSchema.parse(item));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getIngredient(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.ingredientId);
      const item = await DirectoryService.getIngredient(id);
      res.json(IngredientReadSchema.parse(item));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateIngredient(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.ingredientId);
      const data: IngredientUpdateType = req.body;
      const item = await DirectoryService.updateIngredient(id, data);
      res.json(IngredientUpdateSchema.parse(item));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteIngredient(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.ingredientId);
      await DirectoryService.deleteIngredient(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}