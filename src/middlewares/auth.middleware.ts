import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';


export interface AuthRequest extends Request {
    userId?: number;
}


export const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ 
            success: false,
            message: 'JWT-токен не предоставлен',
        });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ 
            success: false,
            message: 'Некорректный формат JWT-токена',
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, jwtConfig.secret) as { userId: number };
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false,
            message: 'Недействительный JWT-токен' 
        });
    }
}
