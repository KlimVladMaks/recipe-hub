import type { Request, Response } from 'express'

import { loginResponseSchema, type LoginRequestType, type RegisterRequestType } from '../schemas/auth.schemas.js'
import { AuthService } from '../services/auth.service.js'
import { userReadSchema } from '../schemas/user.schemas.js'


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
}
