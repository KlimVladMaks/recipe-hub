import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { SubscriptionService } from '../services/subscription.service.js';
import { UserReadListSchema, RecipeReadListSchema, IsSubscribedToUserReadSchema } from '../schemas/index.js';

export class SubscriptionController {
  static async getCurrentUserSubscriptions(req: AuthRequest, res: Response) {
    try {
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '20');
      const subs = await SubscriptionService.getSubscriptions(req.currentUserId!, page, limit);
      res.json(UserReadListSchema.parse(subs));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getCurrentUserSubscribers(req: AuthRequest, res: Response) {
    try {
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '20');
      const subs = await SubscriptionService.getSubscribers(req.currentUserId!, page, limit);
      res.json(UserReadListSchema.parse(subs));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getFeed(req: AuthRequest, res: Response) {
    try {
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '20');
      const feed = await SubscriptionService.getFeed(req.currentUserId!, page, limit);
      res.json(RecipeReadListSchema.parse(feed));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async isSubscribed(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      const result = await SubscriptionService.isSubscribed(req.currentUserId!, userId);
      res.json(IsSubscribedToUserReadSchema.parse(result));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async subscribe(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      await SubscriptionService.subscribe(req.currentUserId!, userId);
      res.status(200).send();
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async unsubscribe(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      await SubscriptionService.unsubscribe(req.currentUserId!, userId);
      res.status(204).send();
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getUserSubscriptions(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '20');
      const subs = await SubscriptionService.getSubscriptions(userId, page, limit);
      res.json(UserReadListSchema.parse(subs));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getUserSubscribers(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '20');
      const subs = await SubscriptionService.getSubscribers(userId, page, limit);
      res.json(UserReadListSchema.parse(subs));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }
}