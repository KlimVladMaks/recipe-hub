import type { Response, NextFunction } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { NotFoundError, parseId } from '../errors.js';
import { StepService } from '../services/step.service.js';
import {
    StepReadListSchema,
    StepReadSchema,
    type StepCreateType,
    type StepUpdateType
} from '../schemas/step.schemas.js';


export class StepController {
    static async getSteps(req: AuthRequest, res: Response) {
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const steps = await StepService.getSteps(recipeId);
        res.status(200).json(StepReadListSchema.parse(steps));
    };

    static async addStep(req: AuthRequest, res: Response) {
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const stepCreateData: StepCreateType = req.body;
        const step = await StepService.addStep(recipeId, stepCreateData);
        res.status(201).json(StepReadSchema.parse(step));
    };

    static async getStep(req: AuthRequest, res: Response) {
        const stepId = parseId(req.params.stepId, 'stepId');
        const step = await StepService.getStep(stepId);
        res.status(200).json(StepReadSchema.parse(step));
    };

    static async updateStep(req: AuthRequest, res: Response) {
        const stepId = parseId(req.params.stepId, 'stepId');
        const stepUpdateData: StepUpdateType = req.body;
        const step = await StepService.updateStep(stepId, stepUpdateData);
        res.status(200).json(StepReadSchema.parse(step));
    };

    static async deleteStep(req: AuthRequest, res: Response) {
        const stepId = parseId(req.params.stepId, 'stepId');
        await StepService.deleteStep(stepId);
        res.status(204).send();
    };

    // Middleware для проверки, что stepId принадлежит recipeId
    static async isCorrectStepId(req: AuthRequest, _res: Response, next: NextFunction) {
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const stepId = parseId(req.params.stepId, 'stepId');
        const isCorrect = await StepService.isCorrectStepId(stepId, recipeId);
        if (!isCorrect) {
            next(new NotFoundError('Шаг не относится к указанному рецепту'));
            return;
        }
        next();
    };
};
