import { Router } from 'express';

import authRouter from './auth.routes.js';

const router = Router();

router.get('/user-service-health', (_req, res) => {
    res.status(200).json({
        status: 'user-service OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    })
});

router.use(authRouter);

export default router;
