import { prisma } from "../config/database.js";
import type { IsSubscribedToUserReadType } from "../schemas/subscription.schema.js";
import type { UserReadType } from "../schemas/user.schemas.js";


export class SubscriptionService {
    static async getSubscriptions(userId: number, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const subscriptions = await prisma.subscription.findMany({
            where: { subscriberId: userId },
            include: {
                subscribedTo: true,
            },
            skip,
            take: limit,
            orderBy: { subscribedAt: 'desc' },
        });

        return subscriptions.map(sub => ({
            id: sub.subscribedTo.id,
            username: sub.subscribedTo.username,
            firstName: sub.subscribedTo.firstName,
            lastName: sub.subscribedTo.lastName,
            about: sub.subscribedTo.about,
            role: sub.subscribedTo.role,
            createdAt: sub.subscribedTo.createdAt,
            updatedAt: sub.subscribedTo.updatedAt,
        }));
    }

    static async getSubscribers(userId: number, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const subscribers = await prisma.subscription.findMany({
            where: { subscribedToId: userId },
            include: {
                subscriber: true,
            },
            skip,
            take: limit,
            orderBy: { subscribedAt: 'desc' },
        });

        return subscribers.map(sub => ({
            id: sub.subscriber.id,
            username: sub.subscriber.username,
            firstName: sub.subscriber.firstName,
            lastName: sub.subscriber.lastName,
            about: sub.subscriber.about,
            role: sub.subscriber.role,
            createdAt: sub.subscriber.createdAt,
            updatedAt: sub.subscriber.updatedAt,
        }));
    }

    static async getFeed(userId: number, page: number, limit: number) {
        const subscriptions = await prisma.subscription.findMany({
            where: { subscriberId: userId },
            select: { subscribedToId: true },
        });
        const authorIds = subscriptions.map(s => s.subscribedToId);
        if (authorIds.length === 0) {
            return []; 
        }

        const skip = (page - 1) * limit;

        const recipes = await prisma.recipe.findMany({
            where: {
                isPublished: true,
                authorId: { in: authorIds },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                author: true,
                media: true,
            },
        });

        return recipes.map(recipe => ({
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            media: recipe.media.map(m => ({
                id: m.id,
                sortOrder: m.sortOrder,
                mediaType: m.mediaType,
                mediaUrl: m.mediaUrl,
                createdAt: m.createdAt,
                updatedAt: m.updatedAt,
            })),
            difficulty: recipe.difficulty,
            createdAt: recipe.createdAt,
            updatedAt: recipe.updatedAt,
            isPublished: recipe.isPublished,
            author: {
                id: recipe.author.id,
                username: recipe.author.username,
                firstName: recipe.author.firstName,
                lastName: recipe.author.lastName,
                about: recipe.author.about,
                role: recipe.author.role,
                createdAt: recipe.author.createdAt,
                updatedAt: recipe.author.updatedAt,
            },
        }));
    }

    static async isSubscribed(currentUserId: number, userId: number): Promise<IsSubscribedToUserReadType> {
        const subscription = await prisma.subscription.findUnique({
            where: {
                subscriberId_subscribedToId: {
                    subscriberId: currentUserId,
                    subscribedToId: userId,
                },
            },
        });
        return { isSubscribed: !!subscription };
    }

    static async subscribe(currentUserId: number, userId: number) {
        if (currentUserId === userId) {
            throw new Error('Cannot subscribe to yourself');
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
            throw new Error('Already subscribed');
        }

        await prisma.subscription.create({
            data: {
                subscriberId: currentUserId,
                subscribedToId: userId,
            },
        });
    }

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
            throw new Error('Subscription not found');
        }

        await prisma.subscription.delete({
            where: {
                subscriberId_subscribedToId: {
                    subscriberId: currentUserId,
                    subscribedToId: userId,
                },
            },
        });
    }

    static async getUserSubscriptions(userId: number, page: number, limit: number) {
        return this.getSubscriptions(userId, page, limit);
    }

    static async getUserSubscribers(userId: number, page: number, limit: number) {
        return this.getSubscribers(userId, page, limit);
    }
}
