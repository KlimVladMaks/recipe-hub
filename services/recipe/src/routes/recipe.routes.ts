import { Router } from 'express'
// import validate from 'express-zod-safe'
import { setGlobalOptions } from 'express-zod-safe';
// import { authMiddleware } from '../middleware/auth.middleware';

setGlobalOptions({
    missingSchemaBehavior: 'any'
});

const recipeRouter = Router();

// recipeRouter.get('/recipes',
//     authMiddleware,
//     RecipeController.getRecipes
// );

// recipeRouter.post('/recipes',
//     authMiddleware,
//     validate({
//         body: RecipeCreateSchema
//     }),
//     RecipeController.addRecipe
// );

export default recipeRouter;
