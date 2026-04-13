import type { Request, Response } from 'express'

import { loginResponseSchema } from '../schemas/auth.schemas.js'
import type { ChangePasswordRequestType, LoginRequestType, RegisterRequestType } from '../schemas/auth.schemas.js'
import { AuthService } from '../services/auth.service.js'
import { userReadSchema } from '../schemas/user.schemas.js'
import type { AuthRequest } from '../middlewares/auth.middleware.js'


export class AuthController {
    static async register(req: Request, res: Response) {
        try {
            const registerRequestData: RegisterRequestType = req.body
            const user = await AuthService.register(registerRequestData)
            res.status(201).json(userReadSchema.parse(user))
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const loginRequestData: LoginRequestType = req.body
            const result = await AuthService.login(loginRequestData);
            res.status(200).json(loginResponseSchema.parse(result))
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        }
    }

    static async changePassword(req: AuthRequest, res: Response) {
        try {
            const { oldPassword, newPassword }: ChangePasswordRequestType = req.body;
            const userId = req.userId!;
            await AuthService.changePassword(userId, oldPassword, newPassword);
            res.status(200).json({
                message: "Пароль успешно изменён"
            })
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        }
    }
}
