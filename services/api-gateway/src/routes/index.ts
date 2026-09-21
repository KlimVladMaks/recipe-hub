import { Router } from 'express';

import { authMiddleware } from '../middleware/auth';
import { createProxy } from '../middleware/proxyHandler';
import { config } from '../config';
import { feedRouter } from './feed';

const router = Router();

router.get('/api-gateway-health', (_req, res) => {
    res.status(200).json({
        status: 'api-gateway OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Служебный публичный прокси к health-эндпоинтам сервисов
router.use('/user-service-health', createProxy(config.service_urls.user));
router.use('/recipe-service-health', createProxy(config.service_urls.recipe));

// ========== USER SERVICE ==========
// Публичные маршруты авторизации (без JWT)
router.use('/auth', createProxy(config.service_urls.user));

// ========== RECIPE SERVICE (вложенные под /users) ==========
// Объявлены до прокси /users, иначе уйдут в user-service
router.use('/users/me/recipes', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/users/me/saved-recipes', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/users/:userId/recipes', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/users/:userId/saved-recipes', authMiddleware, createProxy(config.service_urls.recipe));

// Feed — композиция на стороне gateway, объявлена до /users, чтобы не перехватывалась прокси
router.use('/users/me/feed', authMiddleware, feedRouter);

// Всё остальное из user-service — за JWT
router.use('/users', authMiddleware, createProxy(config.service_urls.user));

// ========== RECIPE SERVICE (корневые ресурсы) ==========
// /recipes покрывает и вложенные ресурсы (/recipes/:id/comments, /steps, /rating, /save)
router.use('/recipes', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/dish-types', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/ingredients', authMiddleware, createProxy(config.service_urls.recipe));

export default router;
