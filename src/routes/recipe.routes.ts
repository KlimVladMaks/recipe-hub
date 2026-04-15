import { Router } from 'express'

const recipeRouter = Router();

recipeRouter.get('/users/me/recipes');

recipeRouter.get('/users/me/saved-recipes');

recipeRouter.get('/users/:userId(\\d+)/recipes');

recipeRouter.get('/users/:userId(\\d+)/saved-recipes');

recipeRouter.get('/recipes');

recipeRouter.post('/recipes');

recipeRouter.get('/recipes/:recipeId(\\d+)');

recipeRouter.patch('/recipes/:recipeId(\\d+)');

recipeRouter.delete('/recipes/:recipeId(\\d+)');

recipeRouter.get('/recipes/:recipeId(\\d+)/media');

recipeRouter.post('/recipes/:recipeId(\\d+)/media');

recipeRouter.get('/recipes/:recipeId(\\d+)/media/{recipeMediaId}');

recipeRouter.patch('/recipes/:recipeId(\\d+)/media/{recipeMediaId}');

recipeRouter.delete('/recipes/:recipeId(\\d+)/media/{recipeMediaId}');

recipeRouter.get('/recipes/:recipeId(\\d+)/steps');

recipeRouter.post('/recipes/:recipeId(\\d+)/steps');

recipeRouter.get('/recipes/:recipeId(\\d+)/steps/{stepId}');

recipeRouter.patch('/recipes/:recipeId(\\d+)/steps/{stepId}');

recipeRouter.delete('/recipes/:recipeId(\\d+)/steps/{stepId}');

recipeRouter.get('/recipes/:recipeId(\\d+)/steps/{stepId}/media');

recipeRouter.post('/recipes/:recipeId(\\d+)/steps/{stepId}/media');

recipeRouter.get('/recipes/:recipeId(\\d+)/steps/{stepId}/media/{stepMediaId}');

recipeRouter.patch('/recipes/:recipeId(\\d+)/steps/{stepId}/media/{stepMediaId}');

recipeRouter.delete('/recipes/:recipeId(\\d+)/steps/{stepId}/media/{stepMediaId}');

recipeRouter.get('/recipes/:recipeId(\\d+)/rating');

recipeRouter.put('/recipes/:recipeId(\\d+)/rating');

recipeRouter.delete('/recipes/:recipeId(\\d+)/rating');

recipeRouter.get('/recipes/:recipeId(\\d+)/save');

recipeRouter.post('/recipes/:recipeId(\\d+)/save');

recipeRouter.delete('/recipes/:recipeId(\\d+)/save');

export default recipeRouter;
