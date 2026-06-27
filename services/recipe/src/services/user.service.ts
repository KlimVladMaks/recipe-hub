import { prisma } from "../config/database.js";
import type { UserReadType } from "../schemas/user.schemas.js";


export class UserService {
    static async getUser(userId: number): Promise<UserReadType> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        return {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            about: user.about,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
