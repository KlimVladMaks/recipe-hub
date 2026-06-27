import { prisma } from '../config/database.js';

export class SubscriptionService {
  static async getSubscriptions(userId: number, page: number, limit: number) {
    const subs = await prisma.subscription.findMany({
      where: { subscriberId: userId },
      skip: (page - 1) * limit, take: limit, orderBy: { subscribedAt: 'desc' },
    });
    return Promise.all(subs.map(async (s) => SubscriptionService.fetchUser(s.subscribedToId)));
  }

  static async getSubscribers(userId: number, page: number, limit: number) {
    const subs = await prisma.subscription.findMany({
      where: { subscribedToId: userId },
      skip: (page - 1) * limit, take: limit, orderBy: { subscribedAt: 'desc' },
    });
    return Promise.all(subs.map(async (s) => SubscriptionService.fetchUser(s.subscriberId)));
  }

  static async getFeed(userId: number, page = 1, limit = 10) {
    const subs = await prisma.subscription.findMany({
      where: { subscriberId: userId },
      select: { subscribedToId: true },
    });
    const authorIds = subs.map(s => s.subscribedToId);
    if (authorIds.length === 0) return [];

    // Fetch recipes from Recipe Service
    const host = process.env.RECIPE_SERVICE_HOST || 'recipe-service';
    const port = process.env.RECIPE_SERVICE_PORT || '3002';
    try {
      const res = await fetch(`http://${host}:${port}/api/recipes?page=${page}&limit=${limit}`);
      if (res.ok) {
        const allRecipes = await res.json() as any[];
        return allRecipes.filter((r: any) => authorIds.includes(r.author?.id));
      }
    } catch {}
    return [];
  }

  static async isSubscribed(currentUserId: number, userId: number) {
    const sub = await prisma.subscription.findUnique({
      where: { subscriberId_subscribedToId: { subscriberId: currentUserId, subscribedToId: userId } },
    });
    return { isSubscribed: !!sub };
  }

  static async subscribe(currentUserId: number, userId: number) {
    if (currentUserId === userId) throw new Error('Cannot subscribe to yourself');
    const existing = await prisma.subscription.findUnique({
      where: { subscriberId_subscribedToId: { subscriberId: currentUserId, subscribedToId: userId } },
    });
    if (existing) throw new Error('Already subscribed');
    await prisma.subscription.create({ data: { subscriberId: currentUserId, subscribedToId: userId } });
  }

  static async unsubscribe(currentUserId: number, userId: number) {
    const sub = await prisma.subscription.findUnique({
      where: { subscriberId_subscribedToId: { subscriberId: currentUserId, subscribedToId: userId } },
    });
    if (!sub) throw new Error('Subscription not found');
    await prisma.subscription.delete({
      where: { subscriberId_subscribedToId: { subscriberId: currentUserId, subscribedToId: userId } },
    });
  }

  private static async fetchUser(userId: number) {
    const host = process.env.AUTH_SERVICE_HOST || 'auth-service';
    const port = process.env.AUTH_SERVICE_PORT || '3001';
    try {
      const res = await fetch(`http://${host}:${port}/api/internal/users/${userId}`);
      if (res.ok) return res.json();
    } catch {}
    return { id: userId, username: 'unknown', firstName: '', lastName: '', about: null, role: 'user', createdAt: new Date(), updatedAt: new Date() };
  }
}