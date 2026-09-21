import { Router } from 'express';

import directoryRouter from './directory.routes.js';
import recipeRouter from './recipe.routes.js';
import commentRouter from './comment.routes.js';
import stepRouter from './step.routes.js';
import internalRouter from './internal.routes.js';

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
router.use(commentRouter);
router.use(stepRouter);
router.use(internalRouter);

export default router;
