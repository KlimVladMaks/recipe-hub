import { Router } from 'express'
import validate, { setGlobalOptions } from 'express-zod-safe';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { RecipeController } from '../controllers/recipe.controller.js';

setGlobalOptions({
    missingSchemaBehavior: 'any'
});

const recipeRouter = Router();

// recipeRouter.get('/users/me/recipes',
//     authMiddleware,
//     RecipeController.getCurrentUserRecipes
// );

// recipeRouter.get('/users/me/saved-recipes',
//     authMiddleware,
//     RecipeController.getCurrentUserSavedRecipes
// );

// recipeRouter.get('/users/:userId/recipes',
//     authMiddleware,
//     RecipeController.getUserRecipes
// );

// recipeRouter.get('/users/:userId/saved-recipes',
//     authMiddleware,
//     RecipeController.getUserSavedRecipes
// );

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

// recipeRouter.get('/recipes/:recipeId',
//     authMiddleware,
//     RecipeController.getRecipe
// );

// recipeRouter.patch('/recipes/:recipeId',
//     authMiddleware,
//     validate({
//         body: RecipeUpdateSchema
//     }),
//     RecipeController.updateRecipe
// );

// recipeRouter.delete('/recipes/:recipeId',
//     authMiddleware,
//     RecipeController.deleteRecipe
// );

// recipeRouter.get('/recipes/:recipeId/media',
//     authMiddleware,
//     RecipeController.getRecipeMedias
// );

// recipeRouter.post('/recipes/:recipeId/media',
//     authMiddleware,
//     validate({
//         body: RecipeMediaCreateSchema
//     }),
//     RecipeController.addRecipeMedia
// );

// recipeRouter.get('/recipes/:recipeId/media/:recipeMediaId',
//     authMiddleware,
//     RecipeController.getRecipeMedia
// );

// recipeRouter.patch('/recipes/:recipeId/media/:recipeMediaId',
//     authMiddleware,
//     validate({
//         body: RecipeMediaUpdateSchema
//     }),
//     RecipeController.updateRecipeMedia
// );

// recipeRouter.delete('/recipes/:recipeId/media/:recipeMediaId',
//     authMiddleware,
//     RecipeController.deleteRecipeMedia
// );

// recipeRouter.get('/recipes/:recipeId/steps',
//     authMiddleware,
//     RecipeController.getRecipeSteps
// );

// recipeRouter.post('/recipes/:recipeId/steps',
//     authMiddleware,
//     RecipeController.addRecipeStep
// );

// recipeRouter.get('/recipes/:recipeId/steps/:stepId',
//     authMiddleware,
//     validate({
//         body: StepCreateSchema
//     }),
//     RecipeController.getRecipeStep
// );

// recipeRouter.patch('/recipes/:recipeId/steps/:stepId',
//     authMiddleware,
//     validate({
//         body: StepUpdateSchema
//     }),
//     RecipeController.updateRecipeStep
// );

// recipeRouter.delete('/recipes/:recipeId/steps/:stepId',
//     authMiddleware,
//     RecipeController.deleteRecipeStep
// );

// recipeRouter.get('/recipes/:recipeId/steps/:stepId/media',
//     authMiddleware,
//     RecipeController.getStepMedias
// );

// recipeRouter.post('/recipes/:recipeId/steps/:stepId/media',
//     authMiddleware,
//     validate({
//         body: StepMediaCreateSchema
//     }),
//     RecipeController.addStepMedia
// );

// recipeRouter.get('/recipes/:recipeId/steps/:stepId/media/:stepMediaId',
//     authMiddleware,
//     RecipeController.getStepMedia
// );

// recipeRouter.patch('/recipes/:recipeId/steps/:stepId/media/:stepMediaId',
//     authMiddleware,
//     validate({
//         body: StepMediaUpdateSchema
//     }),
//     RecipeController.updateStepMedia
// );

// recipeRouter.delete('/recipes/:recipeId/steps/:stepId/media/:stepMediaId',
//     authMiddleware,
//     RecipeController.deleteStepMedia
// );

// recipeRouter.get('/recipes/:recipeId/rating',
//     authMiddleware,
//     RecipeController.getRecipeRating
// );

// recipeRouter.put('/recipes/:recipeId/rating',
//     authMiddleware,
//     validate({
//         body: RecipeRatingPutSchema
//     }),
//     RecipeController.addRecipeRating
// );

// recipeRouter.delete('/recipes/:recipeId/rating',
//     authMiddleware,
//     RecipeController.deleteRecipeRating
// );

// recipeRouter.get('/recipes/:recipeId/save',
//     authMiddleware,
//     RecipeController.isRecipeSaved
// );

// recipeRouter.post('/recipes/:recipeId/save',
//     authMiddleware,
//     RecipeController.saveRecipe
// );

// recipeRouter.delete('/recipes/:recipeId/save',
//     authMiddleware,
//     RecipeController.unsaveRecipe
// );

export default recipeRouter;
