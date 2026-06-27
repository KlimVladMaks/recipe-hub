import { Router } from 'express';

import directoryRouter from './directory.routes';
import recipeRouter from './recipe.routes';

const router = Router();

router.get('/recipe-service-health', (_req, res) => {
    res.status(200).json({
        status: 'recipe-service OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    })
});

router.use(directoryRouter);
router.use(recipeRouter);

export default router;
