import bcrypt from 'bcrypt';

import { prisma } from '../config/database.js';
import { config } from '../config/index.js';

/**
 * Идемпотентно создаёт пользователя-администратора из переменных окружения
 * ADMIN_USERNAME / ADMIN_PASSWORD.
 *
 * Зачем: зарегистрировать администратора через публичный API невозможно
 * (регистрация всегда выдаёт роль `user`, а смена роли требует уже
 * существующего админа). Этот bootstrap даёт «первого админа» для локальной
 * разработки, тестов и Swagger/curl.
 *
 * Правила:
 * - если переменные не заданы — тихо выходим (фича опциональна);
 * - если пользователь уже есть — гарантируем роль `admin`;
 * - если нет — создаём с bcrypt-хешем пароля и ролью `admin`.
 *
 * Ошибки не пробрасываются: bootstrap best-effort и не должен мешать старту.
 */
export async function ensureAdminUser(): Promise<void> {
    const { username, password } = config.admin;
    if (!username || !password) {
        return;
    }

    try {
        const existing = await prisma.user.findUnique({ where: { username } });

        if (existing) {
            if (existing.role !== 'admin') {
                await prisma.user.update({
                    where: { id: existing.id },
                    data: { role: 'admin' },
                });
                console.log(`[admin-bootstrap] Пользователю "${username}" выдана роль admin`);
            }
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: {
                username,
                passwordHash,
                firstName: 'Администратор',
                lastName: 'RecipeHub',
                role: 'admin',
            },
        });
        console.log(`[admin-bootstrap] Создан администратор "${username}"`);
    } catch (error) {
        console.error('[admin-bootstrap] Не удалось создать администратора:', error);
    }
}
