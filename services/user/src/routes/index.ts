import { Router } from 'express'
import authRouter from './auth.routes.js';
import userRouter from './user.routes.js';
import subscriptionRouter from './subscription.routes.js';

const router = Router();

router.use(authRouter);
router.use(userRouter);
router.use(subscriptionRouter);

export default router;
