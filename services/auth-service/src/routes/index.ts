import { Router } from 'express';
import { authMiddleware, isAdmin } from '../middlewares/auth.middleware.js';
import { AuthController } from '../controllers/auth.controller.js';

const router = Router();

// Auth
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.patch('/users/me/password', authMiddleware, AuthController.changePassword);

// Users
router.get('/users', authMiddleware, AuthController.getUsers);
router.get('/users/me', authMiddleware, AuthController.getCurrentUser);
router.patch('/users/me', authMiddleware, AuthController.updateCurrentUser);
router.delete('/users/me', authMiddleware, AuthController.deleteCurrentUser);
router.get('/users/:userId', authMiddleware, AuthController.getUser);
router.delete('/users/:userId', authMiddleware, AuthController.deleteUser);
router.patch('/users/:userId/role', authMiddleware, AuthController.updateUserRole);

// Internal endpoints for other services
router.get('/internal/users/:userId', async (req, res) => {
  try {
    const { AuthService } = await import('../services/auth.service.js');
    const userId = parseInt(req.params.userId);
    const user = await AuthService.getUser(userId);
    res.json({ id: user.id, role: user.role });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
});

router.get('/internal/users/:userId/role', async (req, res) => {
  try {
    const { AuthService } = await import('../services/auth.service.js');
    const userId = parseInt(req.params.userId);
    const user = await AuthService.getUser(userId);
    res.json({ role: user.role });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
});

export default router;