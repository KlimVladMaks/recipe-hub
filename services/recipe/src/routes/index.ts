import { Router } from 'express';

const router = Router();

router.get('/recipe-service-health', (_req, res) => {
    res.status(200).json({
        status: 'recipe-service OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    })
});

export default router;
