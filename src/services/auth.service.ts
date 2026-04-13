import bcrypt from 'bcrypt';

import type { RegisterRequestType } from "../schemas/auth.schemas.js";
import { prisma } from '../config/database.js';


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
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                about: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return user;
    }
}
