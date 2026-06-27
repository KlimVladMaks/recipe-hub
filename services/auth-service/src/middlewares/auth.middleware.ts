import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import { AuthService } from '../services/auth.service.js';

export interface AuthRequest extends Request {
  currentUserId?: number;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'JWT-токен не предоставлен' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Некорректный формат JWT-токена' });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as { currentUserId: number };
    req.currentUserId = decoded.currentUserId;
    next();
  } catch {
    res.status(401).json({ message: 'Недействительный JWT-токен' });
  }
};

export const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isUserAdmin = await AuthService.isUserAdmin(req.currentUserId!);
    if (!isUserAdmin) {
      res.status(403).json({ message: 'Доступ только для администраторов' });
      return;
    }
    next();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};