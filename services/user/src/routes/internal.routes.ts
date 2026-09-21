import { Router } from 'express';

import { BadRequestError, parseId } from '../errors.js';
import { AuthService } from '../services/auth.service.js';
import { SubscriptionService } from '../services/subscription.service.js';
import { UserService } from '../services/user.service.js';
import { UserReadSchema } from '../schemas/user.schemas.js';

const internalRouter = Router();

// Получить нескольких пользователей по IDs (важно: объявлен до /users/:userId)
internalRouter.get('/internal/users/batch', async (req, res) => {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') {
        throw new BadRequestError('Параметр ids обязателен (пример: ids=1,2,3)');
    }
    const userIds = ids
        .split(',')
        .map(id => Number(id.trim()))
        .filter(id => Number.isInteger(id) && id > 0);
    const users = await Promise.all(
        userIds.map(id => UserService.getUser(id).catch(() => null))
    );
    const validUsers = users.filter(u => u !== null);
    res.status(200).json(validUsers.map(u => UserReadSchema.parse(u)));
});

// Проверить, является ли пользователь администратором
internalRouter.get('/internal/users/:userId/is-admin', async (req, res) => {
    const userId = parseId(req.params.userId, 'userId');
    const isAdmin = await AuthService.isUserAdmin(userId);
    res.status(200).json({ isAdmin });
});

// Получить ID авторов, на которых подписан пользователь (для feed)
internalRouter.get('/internal/users/:userId/subscription-ids', async (req, res) => {
    const userId = parseId(req.params.userId, 'userId');
    const authorIds = await SubscriptionService.getSubscriptionUserIds(userId);
    res.status(200).json({ authorIds });
});

// Получить пользователя по ID (для внутренних запросов recipe-service)
internalRouter.get('/internal/users/:userId', async (req, res) => {
    const userId = parseId(req.params.userId, 'userId');
    const user = await UserService.getUser(userId);
    res.status(200).json(UserReadSchema.parse(user));
});

export default internalRouter;
