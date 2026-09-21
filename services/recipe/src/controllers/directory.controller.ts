import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { parseId, parseLimit, parsePage } from '../errors.js';
import { DirectoryService } from '../services/directory.service.js';
import {
    DishTypeCreateType,
    DishTypeReadSchema,
    DishTypeUpdateType,
    IngredientCreateType,
    IngredientReadSchema,
    IngredientUpdateType,
    PaginatedDishTypesSchema,
    PaginatedIngredientsSchema,
} from '../schemas/directory.schemas.js';


export class DirectoryController {
    static async getDishTypes(req: AuthRequest, res: Response) {
        const search = typeof req.query.search === 'string' ? req.query.search : '';
        const page = parsePage(req.query.page);
        const limit = parseLimit(req.query.limit);
        const dishTypes = await DirectoryService.getDishTypes(search, page, limit);
        res.status(200).json(PaginatedDishTypesSchema.parse(dishTypes));
    };

    static async addDishType(req: AuthRequest, res: Response) {
        const dishTypeCreateData: DishTypeCreateType = req.body;
        const dishType = await DirectoryService.createDishType(dishTypeCreateData);
        res.status(201).json(DishTypeReadSchema.parse(dishType));
    };

    static async getDishType(req: AuthRequest, res: Response) {
        const dishTypeId = parseId(req.params.dishTypeId, 'dishTypeId');
        const dishType = await DirectoryService.getDishType(dishTypeId);
        res.status(200).json(DishTypeReadSchema.parse(dishType))
    };

    static async updateDishType(req: AuthRequest, res: Response) {
        const dishTypeId = parseId(req.params.dishTypeId, 'dishTypeId');
        const dishTypeUpdateData: DishTypeUpdateType = req.body;
        const dishType = await DirectoryService.updateDishType(dishTypeId, dishTypeUpdateData);
        res.status(200).json(DishTypeReadSchema.parse(dishType));
    };

    static async deleteDishType(req: AuthRequest, res: Response) {
        const dishTypeId = parseId(req.params.dishTypeId, 'dishTypeId');
        await DirectoryService.deleteDishType(dishTypeId);
        res.status(204).send();
    };

    static async getIngredients(req: AuthRequest, res: Response) {
        const search = typeof req.query.search === 'string' ? req.query.search : '';
        const page = parsePage(req.query.page);
        const limit = parseLimit(req.query.limit);
        const ingredients = await DirectoryService.getIngredients(search, page, limit);
        res.status(200).json(PaginatedIngredientsSchema.parse(ingredients));
    };

    static async addIngredient(req: AuthRequest, res: Response) {
        const ingredientCreateData: IngredientCreateType = req.body;
        const ingredient = await DirectoryService.createIngredient(ingredientCreateData);
        res.status(201).json(IngredientReadSchema.parse(ingredient));
    };

    static async getIngredient(req: AuthRequest, res: Response) {
        const ingredientId = parseId(req.params.ingredientId, 'ingredientId');
        const ingredient = await DirectoryService.getIngredient(ingredientId);
        res.status(200).json(IngredientReadSchema.parse(ingredient))
    };

    static async updateIngredient(req: AuthRequest, res: Response) {
        const ingredientId = parseId(req.params.ingredientId, 'ingredientId');
        const ingredientUpdateData: IngredientUpdateType = req.body;
        const ingredient = await DirectoryService.updateIngredient(ingredientId, ingredientUpdateData);
        res.status(200).json(IngredientReadSchema.parse(ingredient));
    };

    static async deleteIngredient(req: AuthRequest, res: Response) {
        const ingredientId = parseId(req.params.ingredientId, 'ingredientId');
        await DirectoryService.deleteIngredient(ingredientId);
        res.status(204).send();
    };
};
