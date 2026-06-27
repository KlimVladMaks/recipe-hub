import { Router } from 'express';
import validate, { setGlobalOptions } from 'express-zod-safe';
import { 
    authMiddleware, 
    isRecipeAuthor 
} from '../middleware/auth.middleware';
import { StepController } from '../controllers/step.controller';
import { 
    StepCreateSchema, 
    StepUpdateSchema 
} from '../schemas/step.schemas';
import { isCorrectStepId } from '../middleware/auth.middleware';

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
    validate({
        body: StepCreateSchema
    }),
    StepController.addStep
);

stepRouter.get('/recipes/:recipeId/steps/:stepId',
    authMiddleware,
    isCorrectStepId,
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