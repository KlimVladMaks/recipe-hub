import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { prisma } from "../config/database";
import { 
    ChangePasswordRequestType, 
    LoginRequestType, 
    RegisterRequestType 
} from "../schemas/auth.schemas";
import { config } from "../config";


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
            { 
                currentUserId: user.id,
                userRole: user.role
            }, 
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
}
