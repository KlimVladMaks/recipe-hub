export class AppError extends Error {
    readonly status: number;

    constructor(message: string, status = 500) {
        super(message);
        this.name = new.target.name;
        this.status = status;
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'Некорректный запрос') {
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Требуется авторизация') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Доступ запрещён') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Ресурс не найден') {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Конфликт данных') {
        super(message, 409);
    }
}

export function parseId(value: string | string[] | undefined, name = 'id'): number {
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new BadRequestError(`Некорректный параметр ${name}`);
    }
    return parsed;
}

export function parsePage(value: unknown): number {
    const parsed = Number(value ?? 1);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new BadRequestError('Некорректный параметр page');
    }
    return parsed;
}

export function parseLimit(value: unknown, max = 100): number {
    const parsed = Number(value ?? 20);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
        throw new BadRequestError(`Некорректный параметр limit (1..${max})`);
    }
    return parsed;
}
