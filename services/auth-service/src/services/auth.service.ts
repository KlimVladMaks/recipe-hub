import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { jwtConfig } from '../config/jwt.js';
import type { RegisterRequestType, LoginRequestType, ChangePasswordRequestType, UserUpdateType, UserRoleUpdateType } from '../schemas/index.js';
import { Role } from '@prisma/client';

export class AuthService {
  static async register(data: RegisterRequestType) {
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) throw new Error('Пользователь с таким именем уже существует');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        about: data.about || null,
      },
    });
    return user;
  }

  static async login(data: LoginRequestType) {
    const user = await prisma.user.findUnique({ where: { username: data.username } });
    if (!user) throw new Error('Неверное имя пользователя или пароль');

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new Error('Неверное имя пользователя или пароль');

    const token = jwt.sign({ currentUserId: user.id }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn } as jwt.SignOptions);
    return { user, jwtToken: token };
  }

  static async changePassword(userId: number, data: ChangePasswordRequestType) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Пользователь не найден');

    const valid = await bcrypt.compare(data.oldPassword, user.passwordHash);
    if (!valid) throw new Error('Старый пароль неверен');

    const newHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
  }

  static async isUserAdmin(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Пользователь не найден');
    return user.role === Role.admin;
  }

  static async getUsers(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return prisma.user.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } });
  }

  static async getUser(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Пользователь не найден');
    return user;
  }

  static async updateUser(userId: number, data: UserUpdateType) {
    const filtered = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    return prisma.user.update({ where: { id: userId }, data: filtered });
  }

  static async deleteUser(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Пользователь не найден');
    await prisma.user.delete({ where: { id: userId } });
  }

  static async updateUserRole(userId: number, data: UserRoleUpdateType) {
    return prisma.user.update({
      where: { id: userId },
      data: { role: data.role as Role },
    });
  }
}