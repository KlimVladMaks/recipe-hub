import type { Request, Response, NextFunction } from 'express';

import { config } from '../config/index.js';
import { UnauthorizedError } from '../errors.js';


export interface AuthRequest extends Request {
    currentUserId?: number;
}


export const authMiddleware = (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) => {
    const header = req.headers[config.xUserId];
    const currentUserId = Number(header);
    if (!header || !Number.isInteger(currentUserId) || currentUserId <= 0) {
        next(new UnauthorizedError('Не удалось определить пользователя'));
        return;
    }
    req.currentUserId = currentUserId;
    next();
}
