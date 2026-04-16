import express from 'express';
import authRouter from './auth.routes.js';
import userRouter from './user.routes.js';

const router = express.Router();

router.use(authRouter)
router.use(userRouter)

export default router;
