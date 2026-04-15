import type { Response } from 'express'

import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';
import { UserReadListSchema } from '../schemas/user.schemas.js';


export class UserController {
    static async getUsers(req: AuthRequest, res: Response) {
        try {
            const currentUserId = req.currentUserId;
            if (!(await AuthService.isUserAdmin(currentUserId))) {
                res.status(403).json({
                    message: "Пользователь не является админом"
                })
                return;
            };
            const { page=1, limit=20 } = req.query;
            const users = UserService.getUsers(page, limit);
            res.status(200).json(UserReadListSchema.parse(users))
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        }
    };

    static async getCurrentUser(req: AuthRequest, res: Response) {

    };

    static async updateCurrentUser(req: AuthRequest, res: Response) {

    };

    static async deleteCurrentUsers(req: AuthRequest, res: Response) {

    };

    static async getUser(req: AuthRequest, res: Response) {

    };

    static async deleteUser(req: AuthRequest, res: Response) {

    };

    static async updateUserRole(req: AuthRequest, res: Response) {

    };
}
