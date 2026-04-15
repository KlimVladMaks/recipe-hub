import { Router } from 'express';

const commentRouter = Router();

commentRouter.get('/recipes/:recipeId(\\d+)/comments');

commentRouter.post('/recipes/:recipeId(\\d+)/comments');

commentRouter.get('/recipes/:recipeId(\\d+)/comments/:commentId(\\d+)');

commentRouter.patch('/recipes/:recipeId(\\d+)/comments/:commentId(\\d+)');

commentRouter.delete('/recipes/:recipeId(\\d+)/comments/:commentId(\\d+)');

commentRouter.get('/recipes/:recipeId(\\d+)/comments/:commentId(\\d+)/like');

commentRouter.post('/recipes/:recipeId(\\d+)/comments/:commentId(\\d+)/like');

commentRouter.delete('/recipes/:recipeId(\\d+)/comments/:commentId(\\d+)/like');

export default commentRouter;
