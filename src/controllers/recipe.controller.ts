import type { Response } from 'express'
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { RecipeService } from '../services/recipe.service.js';
import { 
    RecipeMediaReadListSchema,
    RecipeMediaReadSchema,
    RecipeReadListSchema, 
    RecipeReadSchema, 
    type RecipeCreateType, 
    type RecipeMediaCreateType, 
    type RecipeMediaUpdateType, 
    type RecipeUpdateType
} from '../schemas/recipe.schema.js';
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';


export class RecipeController {
    static parseQueryParams(req: AuthRequest) {
        const { 
                page:pageStr='1', 
                limit:limitStr='20',
                search="",
                dishTypeIds:dishTypeIdsStr="",
                ingredientIds:ingredientIdsStr="",
                difficulty="",
            } = req.query;
            const page = parseInt(pageStr as string);
            const limit = parseInt(limitStr as string);
            const dishTypeIds = (dishTypeIdsStr as string)
                .split(',')
                .map(id => parseInt(id.trim()));
            const ingredientIds = (ingredientIdsStr as string)
                .split(',')
                .map(id => parseInt(id.trim()));
            return {
                page,
                limit,
                search,
                dishTypeIds,
                ingredientIds,
                difficulty
            };
    };

    static async getCurrentUserRecipes(req: AuthRequest, res: Response) {
        try {
            const currentUserId = req.currentUserId!;
            const {
                page,
                limit,
                search,
                dishTypeIds,
                ingredientIds,
                difficulty
            } = RecipeController.parseQueryParams(req);
            const recipes = await RecipeService.getUserRecipes(
                currentUserId,
                page,
                limit,
                search,
                dishTypeIds,
                ingredientIds,
                difficulty
            );
            res.status(200).json(RecipeReadListSchema.parse(recipes));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getCurrentUserSavedRecipes(req: AuthRequest, res: Response) {
        try {
            const currentUserId = req.currentUserId!;
            const {
                page,
                limit,
                search,
                dishTypeIds,
                ingredientIds,
                difficulty
            } = RecipeController.parseQueryParams(req);
            const recipes = await RecipeService.getUserSavedRecipes(
                currentUserId,
                page,
                limit,
                search,
                dishTypeIds,
                ingredientIds,
                difficulty
            );
            res.status(200).json(RecipeReadListSchema.parse(recipes));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getUserRecipes(req: AuthRequest, res: Response) {
        try {
            const { userId:userIdStr } = req.params;
            const userId = parseInt(userIdStr as string);
            const {
                page,
                limit,
                search,
                dishTypeIds,
                ingredientIds,
                difficulty
            } = RecipeController.parseQueryParams(req);
            const recipes = await RecipeService.getUserRecipes(
                userId,
                page,
                limit,
                search,
                dishTypeIds,
                ingredientIds,
                difficulty
            );
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getUserSavedRecipes(req: AuthRequest, res: Response) {
        try {
            const { userId:userIdStr } = req.params;
            const userId = parseInt(userIdStr as string);
            const {
                page,
                limit,
                search,
                dishTypeIds,
                ingredientIds,
                difficulty
            } = RecipeController.parseQueryParams(req);
            const recipes = await RecipeService.getUserSavedRecipes(
                userId,
                page,
                limit,
                search,
                dishTypeIds,
                ingredientIds,
                difficulty
            );
            res.status(200).json(RecipeReadListSchema.parse(recipes));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getRecipes(req: AuthRequest, res: Response) {
        try {
            const {
                page,
                limit,
                search,
                dishTypeIds,
                ingredientIds,
                difficulty
            } = RecipeController.parseQueryParams(req);
            const recipes = await RecipeService.getRecipes(
                page,
                limit,
                search,
                dishTypeIds,
                ingredientIds,
                difficulty
            );
            res.status(200).json(RecipeReadListSchema.parse(recipes));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async addRecipe(req: AuthRequest, res: Response) {
        try {
            const currentUserId = req.currentUserId!;
            const recipeCreateData: RecipeCreateType = req.body;
            const recipe = await RecipeService.addRecipe(currentUserId, recipeCreateData);
            res.status(201).json(RecipeReadSchema.parse(recipe));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getRecipe(req: AuthRequest, res: Response) {
        try {
            const { recipeId:recipeIdStr } = req.params;
            const recipeId = parseInt(recipeIdStr as string);
            const recipe = await RecipeService.getRecipe(recipeId);
            res.status(200).json(RecipeReadSchema.parse(recipe));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async updateRecipe(req: AuthRequest, res: Response) {
        try {
            const currentUserId = req.currentUserId!;
            const { recipeId:recipeIdStr } = req.params;
            const recipeId = parseInt(recipeIdStr as string);
            if (!(RecipeService.isUserRecipeAuthor(currentUserId, recipeId) || AuthService.isUserAdmin(currentUserId))) {
                res.status(403).json({
                    message: "Доступ только для автора и администраторов"
                })
                return;
            };
            const recipeUpdateData: RecipeUpdateType = req.body;
            const recipe = await RecipeService.updateRecipe(recipeId, recipeUpdateData);
            res.status(200).json(RecipeReadSchema.parse(recipe));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async deleteRecipe(req: AuthRequest, res: Response) {
        try {
            const currentUserId = req.currentUserId!;
            const { recipeId:recipeIdStr } = req.params;
            const recipeId = parseInt(recipeIdStr as string);
            if (!(RecipeService.isUserRecipeAuthor(currentUserId, recipeId) || AuthService.isUserAdmin(currentUserId))) {
                res.status(403).json({
                    message: "Доступ только для автора и администраторов"
                })
                return;
            };
            await RecipeService.deleteRecipe(recipeId);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getRecipeMedias(req: AuthRequest, res: Response) {
        try {
            const { recipeId:recipeIdStr } = req.params;
            const recipeId = parseInt(recipeIdStr as string);
            const recipeMedias = await RecipeService.getRecipeMedias(recipeId);
            res.status(200).json(RecipeMediaReadListSchema.parse(recipeMedias));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async addRecipeMedia(req: AuthRequest, res: Response) {
        try {
            const currentUserId = req.currentUserId!;
            const { recipeId:recipeIdStr } = req.params;
            const recipeId = parseInt(recipeIdStr as string);
            if (!(RecipeService.isUserRecipeAuthor(currentUserId, recipeId))) {
                res.status(403).json({
                    message: "Доступ только для автора"
                })
            };
            const recipeMediaCreateData: RecipeMediaCreateType = req.body;
            const recipeMedia = await RecipeService.addRecipeMedia(recipeId, recipeMediaCreateData);
            res.status(201).json(RecipeMediaReadSchema.parse(recipeMedia));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getRecipeMedia(req: AuthRequest, res: Response) {
        try {
            const { recipeId:recipeIdStr, recipeMediaId:recipeMediaIdStr } = req.params;
            const recipeId = parseInt(recipeIdStr as string);
            const recipeMediaId = parseInt(recipeMediaIdStr as string);
            if (!(RecipeService.isCorrectRecipeMediaId(recipeMediaId, recipeId))) {
                res.status(400).json({
                    message: "Данное медиа не принадлежит данному рецепту"
                });
            };
            const recipeMedia = await RecipeService.getRecipeMedia(recipeMediaId);
            res.status(200).json(RecipeMediaReadSchema.parse(recipeMedia));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async updateRecipeMedia(req: AuthRequest, res: Response) {
        try {
            const currentUserId = req.currentUserId!;
            const { recipeId:recipeIdStr, recipeMediaId:recipeMediaIdStr } = req.params;
            const recipeId = parseInt(recipeIdStr as string);
            const recipeMediaId = parseInt(recipeMediaIdStr as string);
            if (!(RecipeService.isCorrectRecipeMediaId(recipeMediaId, recipeId))) {
                res.status(400).json({
                    message: "Данное медиа не принадлежит данному рецепту"
                });
            };
            if (!(RecipeService.isUserRecipeAuthor(currentUserId, recipeId) || AuthService.isUserAdmin(currentUserId))) {
                res.status(403).json({
                    message: "Доступ только для автора и администраторов"
                })
                return;
            };
            const recipeMediaUpdateData: RecipeMediaUpdateType = req.body;
            const recipeMedia = await RecipeService.updateRecipeMedia(recipeMediaId, recipeMediaUpdateData);
            res.status(200).json(RecipeMediaReadSchema.parse(recipeMedia));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async deleteRecipeMedia(req: AuthRequest, res: Response) {
        try {
            const currentUserId = req.currentUserId!;
            const { recipeId:recipeIdStr, recipeMediaId:recipeMediaIdStr } = req.params;
            const recipeId = parseInt(recipeIdStr as string);
            const recipeMediaId = parseInt(recipeMediaIdStr as string);
            if (!(RecipeService.isCorrectRecipeMediaId(recipeMediaId, recipeId))) {
                res.status(400).json({
                    message: "Данное медиа не принадлежит данному рецепту"
                });
            };
            if (!(RecipeService.isUserRecipeAuthor(currentUserId, recipeId) || AuthService.isUserAdmin(currentUserId))) {
                res.status(403).json({
                    message: "Доступ только для автора и администраторов"
                })
                return;
            };
            await RecipeService.deleteRecipeMedia(recipeMediaId);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getRecipeSteps(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async addRecipeStep(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getRecipeStep(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async updateRecipeStep(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async deleteRecipeStep(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getStepMedias(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async addStepMedia(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getStepMedia(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async updateStepMedia(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async deleteStepMedia(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async getRecipeRating(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async addRecipeRating(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async deleteRecipeRating(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async isRecipeSaved(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async saveRecipe(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async unsaveRecipe(req: AuthRequest, res: Response) {
        try {
            
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };
}
