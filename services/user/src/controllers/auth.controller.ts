import type { Request, Response } from 'express'

import {
    ChangePasswordRequestType,
    LoginRequestType,
    LoginResponseSchema,
    RegisterRequestType
} from '../schemas/auth.schemas.js'
import { UserReadSchema } from '../schemas/user.schemas.js'
import { AuthService } from '../services/auth.service.js'
import { AuthRequest } from '../middleware/auth.middleware.js'


export class AuthController {
    static async register(req: Request, res: Response) {
        const registerRequestData: RegisterRequestType = req.body
        const user = await AuthService.register(registerRequestData)
        res.status(201).json(UserReadSchema.parse(user))
    }

    static async login(req: Request, res: Response) {
        const loginRequestData: LoginRequestType = req.body
        const result = await AuthService.login(loginRequestData);
        res.status(200).json(LoginResponseSchema.parse(result));
    };

    static async changePassword(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const changePasswordRequestData: ChangePasswordRequestType = req.body;
        await AuthService.changePassword(currentUserId, changePasswordRequestData);
        res.status(200).send();
    }
}
