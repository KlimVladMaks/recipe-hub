import { Router } from 'express';
import validate, { setGlobalOptions } from 'express-zod-safe';
import { authMiddleware, isRecipeAuthor } from '../middlewares/auth.middleware.js';

setGlobalOptions({
    missingSchemaBehavior: 'any'
});

const stepRouter = Router();

stepRouter.get('/recipes/:recipeId/steps',
    authMiddleware,
    StepController.getSteps
);

stepRouter.post('/recipes/:recipeId/steps',
    authMiddleware,
    isRecipeAuthor,
    StepController.addStep
);

stepRouter.get('/recipes/:recipeId/steps/:stepId',
    authMiddleware,
    isCorrectStepId,
    validate({
        body: StepCreateSchema
    }),
    StepController.getStep
);

stepRouter.patch('/recipes/:recipeId/steps/:stepId',
    authMiddleware,
    isCorrectStepId,
    isRecipeAuthor,
    validate({
        body: StepUpdateSchema
    }),
    StepController.updateStep
);

stepRouter.delete('/recipes/:recipeId/steps/:stepId',
    authMiddleware,
    isCorrectStepId,
    isRecipeAuthor,
    StepController.deleteStep
);

export default stepRouter;
