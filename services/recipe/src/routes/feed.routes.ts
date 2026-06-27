import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { FeedController } from '../controllers/feed.controller';

const feedRouter = Router();

feedRouter.get('/feed',
    authMiddleware,
    FeedController.getFeed
);

export default feedRouter;