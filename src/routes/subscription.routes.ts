import { Router } from 'express';

const subscriptionRouter = Router();

subscriptionRouter.get('/users/me/subscriptions');

subscriptionRouter.get('/users/me/subscribers');

subscriptionRouter.get('/users/me/feed');

subscriptionRouter.get('/users/:userId(\\d+)/subscribe');

subscriptionRouter.post('/users/:userId(\\d+)/subscribe');

subscriptionRouter.delete('/users/:userId(\\d+)/subscribe');

subscriptionRouter.get('/users/:userId(\\d+)/subscriptions');

subscriptionRouter.get('/users/:userId(\\d+)/subscribers');

export default subscriptionRouter;
