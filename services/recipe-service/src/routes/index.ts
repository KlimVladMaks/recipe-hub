import { Router } from 'express';
import { authMiddleware, isRecipeAuthor, isRecipeAuthorOrAdmin } from '../middlewares/auth.middleware.js';
import { RecipeController } from '../controllers/recipe.controller.js';

const router = Router();

// User recipes
router.get('/users/me/recipes', authMiddleware, RecipeController.getCurrentUserRecipes);
router.get('/users/me/saved-recipes', authMiddleware, RecipeController.getCurrentUserSavedRecipes);
router.get('/users/:userId/recipes', authMiddleware, RecipeController.getUserRecipes);
router.get('/users/:userId/saved-recipes', authMiddleware, RecipeController.getUserSavedRecipes);

// Recipes CRUD
router.get('/recipes', authMiddleware, RecipeController.getRecipes);
router.post('/recipes', authMiddleware, RecipeController.addRecipe);
router.get('/recipes/:recipeId', authMiddleware, RecipeController.getRecipe);
router.patch('/recipes/:recipeId', authMiddleware, isRecipeAuthor, RecipeController.updateRecipe);
router.delete('/recipes/:recipeId', authMiddleware, isRecipeAuthorOrAdmin, RecipeController.deleteRecipe);

// Ratings
router.get('/recipes/:recipeId/rating', authMiddleware, RecipeController.getRecipeRating);
router.put('/recipes/:recipeId/rating', authMiddleware, RecipeController.putRecipeRating);
router.delete('/recipes/:recipeId/rating', authMiddleware, RecipeController.deleteRecipeRating);

// Saved
router.get('/recipes/:recipeId/save', authMiddleware, RecipeController.isRecipeSaved);
router.post('/recipes/:recipeId/save', authMiddleware, RecipeController.saveRecipe);
router.delete('/recipes/:recipeId/save', authMiddleware, RecipeController.unsaveRecipe);

// Steps
router.get('/recipes/:recipeId/steps', authMiddleware, RecipeController.getSteps);
router.post('/recipes/:recipeId/steps', authMiddleware, isRecipeAuthor, RecipeController.addStep);
router.get('/recipes/:recipeId/steps/:stepId', authMiddleware, RecipeController.getStep);
router.patch('/recipes/:recipeId/steps/:stepId', authMiddleware, isRecipeAuthor, RecipeController.updateStep);
router.delete('/recipes/:recipeId/steps/:stepId', authMiddleware, isRecipeAuthor, RecipeController.deleteStep);

// Internal
router.get('/internal/recipes/:recipeId/author', async (req, res) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    const { RecipeService } = await import('../services/recipe.service.js');
    const recipe = await RecipeService.getRecipe(recipeId);
    res.json({ authorId: recipe.author.id });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
});

router.get('/internal/recipes/:recipeId/exists', async (req, res) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    const { RecipeService } = await import('../services/recipe.service.js');
    await RecipeService.getRecipe(recipeId);
    res.json({ exists: true });
  } catch {
    res.json({ exists: false });
  }
});

export default router;