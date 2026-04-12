import type { Request, Response } from 'express'

import type { RegisterRequestType } from '../schemas/auth.schemas.js'
import { AuthService } from '../services/auth.service.js'
import { userReadSchema } from '../schemas/user.schemas.js'


export class AuthController {
    static async register(req: Request, res: Response) {
        try {
            const registerRequestData: RegisterRequestType = req.body
            const user = await AuthService.register(registerRequestData)
            const userReadData = userReadSchema.parse(user)
            res.status(201).json({
                success: true,
                message: 'Пользователь успешно создан',
                data: userReadData
            })
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
}
