import type { Request, Response } from 'express'
import type { RegisterRequestType } from '../schemas/index.js'


export class AuthController {
    static async register(req: Request, res: Response) {
        const userCreateData: RegisterRequestType = req.body
        const user = await AuthService.createUser(userCreateData)
        res.status(201).json({
            success: true,
            message: 'Пользователь успешно создан',
            data: user
        })
    }
}
