import { Request, Response, NextFunction } from 'express';

import { AppError } from '../errors.js';

interface PrismaLikeError {
    code?: string;
    message?: string;
}

const PRISMA_STATUS: Record<string, number> = {
    P2002: 409,
    P2003: 400,
    P2025: 404,
};

export const errorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (err instanceof AppError) {
        res.status(err.status).json({ error: err.message });
        return;
    }

    const prismaCode = (err as PrismaLikeError)?.code;
    if (prismaCode && PRISMA_STATUS[prismaCode]) {
        const status = PRISMA_STATUS[prismaCode];
        const message = status === 409
            ? 'Запись с такими данными уже существует'
            : status === 404
                ? 'Ресурс не найден'
                : 'Некорректные связанные данные';
        res.status(status).json({ error: message });
        return;
    }

    console.error(err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};
