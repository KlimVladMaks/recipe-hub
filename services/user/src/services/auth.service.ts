import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { 
    type ChangePasswordRequestType, 
    type LoginRequestType, 
    type RegisterRequestType 
} from "../schemas/auth.schemas.js";
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { Role } from '@prisma/client';
import { publishUserCreated } from './rabbitmq.service.js';


export class AuthService {
    static async register(registerRequestData: RegisterRequestType) {
        const { username, password, firstName, lastName, about } = registerRequestData;
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });
        if (existingUser) {
            throw new Error('Пользователь с таким именем уже существует');
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                passwordHash,
                firstName,
                lastName,
                about: about || null
            },
        });

        // Публикуем событие о создании пользователя в RabbitMQ
        await publishUserCreated({
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            about: user.about,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        });

        return user;
    }

    static async login(loginRequestData: LoginRequestType) {
        const { username, password } = loginRequestData;

        const user = await prisma.user.findUnique({
            where: { username },
        });
        if (!user) {
            throw new Error('Неверное имя пользователя или пароль');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Неверное имя пользователя или пароль');
        }

        const token = jwt.sign(
            { currentUserId: user.id }, 
            config.jwt.secret, 
            { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
        );

        return { 
            user: user, 
            jwtToken: token,
        }
    }

    static async changePassword(userId: number, changePasswordRequestData: ChangePasswordRequestType) {
        const { oldPassword, newPassword } = changePasswordRequestData;
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error('Пользователь не найден');
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Старый пароль неверен');
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });

        return;
    }

    static async isUserAdmin(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error('isUserAdmin: Пользователь не найден');
        }
        return user.role === Role.admin;
    }
}
