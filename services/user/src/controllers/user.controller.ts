import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { ForbiddenError, parseId, parseLimit, parsePage } from '../errors.js';
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';
import {
    PaginatedUsersSchema,
    UserReadSchema,
    type UserRoleUpdateType,
    type UserUpdateType
} from '../schemas/user.schemas.js';


export class UserController {
    static async getUsers(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        if (!(await AuthService.isUserAdmin(currentUserId))) {
            throw new ForbiddenError('Доступ только для администраторов');
        }
        const page = parsePage(req.query.page);
        const limit = parseLimit(req.query.limit);
        const users = await UserService.getUsers(page, limit);
        res.status(200).json(PaginatedUsersSchema.parse(users))
    };

    static async getCurrentUser(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const currentUser = await UserService.getUser(currentUserId)
        res.status(200).json(UserReadSchema.parse(currentUser))
    };

    static async updateCurrentUser(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const userUpdateData: UserUpdateType = req.body;
        const updatedCurrentUser = await UserService.updateUser(currentUserId, userUpdateData);
        res.status(200).json(UserReadSchema.parse(updatedCurrentUser));
    };

    static async deleteCurrentUser(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        await UserService.deleteUser(currentUserId);
        res.status(204).send();
    };

    static async getUser(req: AuthRequest, res: Response) {
        const userId = parseId(req.params.userId, 'userId');
        const user = await UserService.getUser(userId);
        res.status(200).json(UserReadSchema.parse(user));
    };

    static async deleteUser(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        if (!(await AuthService.isUserAdmin(currentUserId))) {
            throw new ForbiddenError('Доступ только для администраторов');
        }
        const userId = parseId(req.params.userId, 'userId');
        await UserService.deleteUser(userId);
        res.status(204).send();
    };

    static async updateUserRole(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        if (!(await AuthService.isUserAdmin(currentUserId))) {
            throw new ForbiddenError('Доступ только для администраторов');
        }
        const userId = parseId(req.params.userId, 'userId');
        const userRoleUpdateData: UserRoleUpdateType = req.body;
        const user = await UserService.updateUserRole(userId, userRoleUpdateData);
        res.status(200).json(UserReadSchema.parse(user))
    };
}
