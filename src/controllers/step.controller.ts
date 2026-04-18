import type { Response } from 'express'
import type { AuthRequest } from "../middlewares/auth.middleware.js";


export class StepController {
    static async getRecipeSteps(req: AuthRequest, res: Response) {
            try {
                const { recipeId:recipeIdStr } = req.params;
                const recipeId = parseInt(recipeIdStr as string);
                const steps = await StepService.getSteps(recipeId);
                res.status(200).json(StepReadListSchema.parse(steps));
            } catch (error: any) {
                res.status(400).json({
                    message: error.message,
                });
            };
        };
    
        static async addRecipeStep(req: AuthRequest, res: Response) {
            try {
                const currentUserId = req.currentUserId!;
                const { recipeId:recipeIdStr } = req.params;
                const recipeId = parseInt(recipeIdStr as string);
                if (!RecipeService.isUserRecipeAuthor(currentUserId, recipeId)) {
                    res.status(403).json({
                        message: "Доступ только для автора"
                    })
                    return;
                };
                const stepCreateData: StepCreateType = req.body;
                const step = await RecipeService.addStep(recipeId, stepCreateData);
                res.status(201).json(StepReadSchema.parse(step));
            } catch (error: any) {
                res.status(400).json({
                    message: error.message,
                });
            };
        };
    
        static async getRecipeStep(req: AuthRequest, res: Response) {
            try {
                const { recipeId:recipeIdStr, stepId:stepIdStr } = req.params;
                const recipeId = parseInt(recipeIdStr as string);
                const stepId = parseInt(stepIdStr as string);
                if (!(RecipeService.isCorrectStepId(stepId, recipeId))) {
                    res.status(400).json({
                        message: "Данный шаг не принадлежит данному рецепту"
                    });
                    return;
                };
                const step = await RecipeService.getStep(stepId);
                res.status(200).json(StepReadSchema.parse(step));
            } catch (error: any) {
                res.status(400).json({
                    message: error.message,
                });
            };
        };
    
        static async updateRecipeStep(req: AuthRequest, res: Response) {
            try {
                const currentUserId = req.currentUserId!;
                const { recipeId:recipeIdStr, stepId:stepIdStr } = req.params;
                const recipeId = parseInt(recipeIdStr as string);
                const stepId = parseInt(stepIdStr as string);
                if (!(RecipeService.isCorrectStepId(stepId, recipeId))) {
                    res.status(400).json({
                        message: "Данный шаг не принадлежит данному рецепту"
                    });
                    return;
                };
                if (!RecipeService.isUserRecipeAuthor(currentUserId, recipeId)) {
                    res.status(403).json({
                        message: "Доступ только для автора"
                    })
                    return;
                };
                const stepUpdateData: StepUpdateType = req.body;
                const step = await RecipeService.updateStep(stepId, stepUpdateData);
                res.status(200).json(StepReadSchema.parse(step));
            } catch (error: any) {
                res.status(400).json({
                    message: error.message,
                });
            };
        };
    
        static async deleteRecipeStep(req: AuthRequest, res: Response) {
            try {
                const currentUserId = req.currentUserId!;
                const { recipeId:recipeIdStr, stepId:stepIdStr } = req.params;
                const recipeId = parseInt(recipeIdStr as string);
                const stepId = parseInt(stepIdStr as string);
                if (!(RecipeService.isCorrectStepId(stepId, recipeId))) {
                    res.status(400).json({
                        message: "Данный шаг не принадлежит данному рецепту"
                    });
                    return;
                };
                if (!RecipeService.isUserRecipeAuthor(currentUserId, recipeId)) {
                    res.status(403).json({
                        message: "Доступ только для автора"
                    })
                    return;
                };
                await RecipeService.deleteStep(stepId);
            } catch (error: any) {
                res.status(400).json({
                    message: error.message,
                });
            };
        };
};
