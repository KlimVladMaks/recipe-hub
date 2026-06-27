import { Router } from 'express';
import { authMiddleware, isAdmin } from '../middlewares/auth.middleware.js';
import { DirectoryController } from '../controllers/directory.controller.js';

const router = Router();

router.get('/dish-types', authMiddleware, DirectoryController.getDishTypes);
router.post('/dish-types', authMiddleware, isAdmin, DirectoryController.addDishType);
router.get('/dish-types/:dishTypeId', authMiddleware, DirectoryController.getDishType);
router.patch('/dish-types/:dishTypeId', authMiddleware, isAdmin, DirectoryController.updateDishType);
router.delete('/dish-types/:dishTypeId', authMiddleware, isAdmin, DirectoryController.deleteDishType);

router.get('/ingredients', authMiddleware, DirectoryController.getIngredients);
router.post('/ingredients', authMiddleware, isAdmin, DirectoryController.addIngredient);
router.get('/ingredients/:ingredientId', authMiddleware, DirectoryController.getIngredient);
router.patch('/ingredients/:ingredientId', authMiddleware, isAdmin, DirectoryController.updateIngredient);
router.delete('/ingredients/:ingredientId', authMiddleware, isAdmin, DirectoryController.deleteIngredient);

export default router;