import type { Request, Response } from 'express'

import { RegisterRequestType } from '../schemas/auth.schemas'
import { AuthService } from '../services/auth.service.js'
import { UserReadSchema } from '../schemas/user.schemas.js'


export class AuthController {
    static async register(req: Request, res: Response) {
        try {
            const registerRequestData: RegisterRequestType = req.body
            const user = await AuthService.register(registerRequestData)
            res.status(201).json(UserReadSchema.parse(user))
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        }
    }
}
