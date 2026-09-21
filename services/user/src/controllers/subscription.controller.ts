import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { parseId, parseLimit, parsePage } from '../errors.js';
import { SubscriptionService } from '../services/subscription.service.js';
import { PaginatedUsersSchema } from '../schemas/user.schemas.js';
import { IsSubscribedToUserReadSchema } from '../schemas/subscription.schema.js';


export class SubscriptionController {
    static async getCurrentUserSubscriptions(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const page = parsePage(req.query.page);
        const limit = parseLimit(req.query.limit);
        const subscriptions = await SubscriptionService.getSubscriptions(currentUserId, page, limit);
        res.status(200).json(PaginatedUsersSchema.parse(subscriptions));
    };

    static async getCurrentUserSubscribers(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const page = parsePage(req.query.page);
        const limit = parseLimit(req.query.limit);
        const subscribers = await SubscriptionService.getSubscribers(currentUserId, page, limit);
        res.status(200).json(PaginatedUsersSchema.parse(subscribers));
    };

    static async isSubscribed(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const userId = parseId(req.params.userId, 'userId');
        const isSubscribed = await SubscriptionService.isSubscribed(currentUserId, userId);
        res.status(200).json(IsSubscribedToUserReadSchema.parse(isSubscribed));
    };

    static async subscribe(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const userId = parseId(req.params.userId, 'userId');
        await SubscriptionService.subscribe(currentUserId, userId);
        res.status(200).send();
    };

    static async unsubscribe(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const userId = parseId(req.params.userId, 'userId');
        await SubscriptionService.unsubscribe(currentUserId, userId);
        res.status(204).send();
    };

    static async getUserSubscriptions(req: AuthRequest, res: Response) {
        const userId = parseId(req.params.userId, 'userId');
        const page = parsePage(req.query.page);
        const limit = parseLimit(req.query.limit);
        const subscriptions = await SubscriptionService.getSubscriptions(userId, page, limit);
        res.status(200).json(PaginatedUsersSchema.parse(subscriptions));
    };

    static async getUserSubscribers(req: AuthRequest, res: Response) {
        const userId = parseId(req.params.userId, 'userId');
        const page = parsePage(req.query.page);
        const limit = parseLimit(req.query.limit);
        const subscribers = await SubscriptionService.getSubscribers(userId, page, limit);
        res.status(200).json(PaginatedUsersSchema.parse(subscribers));
    };
};
