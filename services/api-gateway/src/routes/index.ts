import { Router } from "express";

import { authMiddleware } from "../middleware/auth";
import { createProxy } from '../middleware/proxyHandler';
import { config } from "../config";


const router = Router();


router.get('/api-gateway-health', (_req, res) => {
    res.status(200).json({
        status: 'api-gateway OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    })
});


// ========== RECIPE SERVICE ==========

router.use('/recipes', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/dish-types', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/ingredients', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/users/me/recipes', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/users/me/saved-recipes', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/users/:userId/recipes', authMiddleware, createProxy(config.service_urls.recipe));
router.use('/users/:userId/saved-recipes', authMiddleware, createProxy(config.service_urls.recipe));


// ========== USER SERVICE ==========

router.use('/user-service-health', createProxy(config.service_urls.user));
router.use('/auth', createProxy(config.service_urls.user));
router.use('/users', authMiddleware, createProxy(config.service_urls.user));


export default router;
