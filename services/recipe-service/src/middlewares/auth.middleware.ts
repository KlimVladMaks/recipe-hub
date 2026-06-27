import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
    const secret = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, secret) as { currentUserId: number };
    req.currentUserId = decoded.currentUserId;
    next();
  } catch {
    res.status(401).json({ message: 'Недействительный JWT-токен' });
  }
};

export const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.currentUserId!;
    const host = process.env.AUTH_SERVICE_HOST || 'auth-service';
    const port = process.env.AUTH_SERVICE_PORT || '3001';
    const response = await fetch(`http://${host}:${port}/api/internal/users/${userId}/role`);
    if (!response.ok) {
      res.status(403).json({ message: 'Доступ только для администраторов' });
      return;
    }
    const data = await response.json() as { role: string };
    if (data.role !== 'admin') {
      res.status(403).json({ message: 'Доступ только для администраторов' });
      return;
    }
    next();
  } catch {
    res.status(403).json({ message: 'Доступ только для администраторов' });
  }
};

export const isRecipeAuthor = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.currentUserId!;
    const recipeId = parseInt(req.params.recipeId);
    const { RecipeService } = await import('../services/recipe.service.js');
    const isAuthor = await RecipeService.isUserRecipeAuthor(userId, recipeId);
    if (!isAuthor) {
      res.status(403).json({ message: 'Доступ только для автора рецепта' });
      return;
    }
    next();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const isRecipeAuthorOrAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.currentUserId!;
    const recipeId = parseInt(req.params.recipeId);
    const { RecipeService } = await import('../services/recipe.service.js');
    const isAuthor = await RecipeService.isUserRecipeAuthor(userId, recipeId);
    if (isAuthor) { next(); return; }

    const host = process.env.AUTH_SERVICE_HOST || 'auth-service';
    const port = process.env.AUTH_SERVICE_PORT || '3001';
    const response = await fetch(`http://${host}:${port}/api/internal/users/${userId}/role`);
    if (response.ok) {
      const data = await response.json() as { role: string };
      if (data.role === 'admin') { next(); return; }
    }
    res.status(403).json({ message: 'Доступ только для автора рецепта и администраторов' });
  } catch {
    res.status(403).json({ message: 'Доступ только для автора рецепта и администраторов' });
  }
};