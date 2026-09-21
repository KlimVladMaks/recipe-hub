import type { Role } from '../generated/prisma/client';
import { prisma } from '../config/database.js';
import { NotFoundError } from '../errors.js';
import type { UserRoleUpdateType, UserUpdateType } from '../schemas/user.schemas.js';
import { publishUserDeleted } from './eventBus.js';


export class UserService {
    static async getUsers(page: number, limit: number) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            prisma.user.findMany({
                skip: skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.user.count(),
        ]);
        return { items, total, page, limit };
    };

    static async getUser(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new NotFoundError('Пользователь не найден');
        };
        return user;
    };

    static async updateUser(userId: number, userUpdateData: UserUpdateType) {
        const filteredData = Object.fromEntries(
            Object.entries(userUpdateData).filter(([_, v]) => v !== undefined)
        );
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: filteredData,
        });
        return updatedUser;
    };

    static async deleteUser(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new NotFoundError('Пользователь не найден');
        }
        await prisma.user.delete({
            where: { id: userId }
        });
        // Отправляем событие об удалении пользователя
        publishUserDeleted(userId);
    };

    static async updateUserRole(userId: number, userRoleUpdateData: UserRoleUpdateType) {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                role: userRoleUpdateData.role as Role,
            },
        });
        return updatedUser;
    };
};
