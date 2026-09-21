import { prisma } from '../config/database.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors.js';


const toPublicUser = (user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    about: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}) => ({
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    about: user.about,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});


export class SubscriptionService {
    static async getSubscriptions(userId: number, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const [subscriptions, total] = await Promise.all([
            prisma.subscription.findMany({
                where: { subscriberId: userId },
                include: {
                    subscribedTo: true,
                },
                skip,
                take: limit,
                orderBy: { subscribedAt: 'desc' },
            }),
            prisma.subscription.count({ where: { subscriberId: userId } }),
        ]);

        return {
            items: subscriptions.map(sub => toPublicUser(sub.subscribedTo)),
            total,
            page,
            limit,
        };
    };

    static async getSubscribers(userId: number, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const [subscribers, total] = await Promise.all([
            prisma.subscription.findMany({
                where: { subscribedToId: userId },
                include: {
                    subscriber: true,
                },
                skip,
                take: limit,
                orderBy: { subscribedAt: 'desc' },
            }),
            prisma.subscription.count({ where: { subscribedToId: userId } }),
        ]);

        return {
            items: subscribers.map(sub => toPublicUser(sub.subscriber)),
            total,
            page,
            limit,
        };
    };

    static async getSubscriptionUserIds(userId: number): Promise<number[]> {
        const subscriptions = await prisma.subscription.findMany({
            where: { subscriberId: userId },
            select: { subscribedToId: true },
        });
        return subscriptions.map(s => s.subscribedToId);
    };

    static async isSubscribed(currentUserId: number, userId: number) {
        const subscription = await prisma.subscription.findUnique({
            where: {
                subscriberId_subscribedToId: {
                    subscriberId: currentUserId,
                    subscribedToId: userId,
                },
            },
        });
        return { isSubscribed: !!subscription };
    };

    static async subscribe(currentUserId: number, userId: number) {
        if (currentUserId === userId) {
            throw new BadRequestError('Нельзя подписаться на самого себя');
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!targetUser) {
            throw new NotFoundError('Пользователь не найден');
        }

        const existing = await prisma.subscription.findUnique({
            where: {
                subscriberId_subscribedToId: {
                    subscriberId: currentUserId,
                    subscribedToId: userId,
                },
            },
        });
        if (existing) {
            throw new ConflictError('Уже подписан');
        }

        await prisma.subscription.create({
            data: {
                subscriberId: currentUserId,
                subscribedToId: userId,
            },
        });
    };

    static async unsubscribe(currentUserId: number, userId: number) {
        const subscription = await prisma.subscription.findUnique({
            where: {
                subscriberId_subscribedToId: {
                    subscriberId: currentUserId,
                    subscribedToId: userId,
                },
            },
        });
        if (!subscription) {
            throw new NotFoundError('Подписка не найдена');
        }
        await prisma.subscription.delete({
            where: {
                subscriberId_subscribedToId: {
                    subscriberId: currentUserId,
                    subscribedToId: userId,
                },
            },
        });
    };
};
