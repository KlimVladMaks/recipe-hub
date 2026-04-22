import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import { RecipeService } from '../services/recipe.service.js';
import { AuthService } from '../services/auth.service.js';


export interface AuthRequest extends Request {
    currentUserId?: number;
}


export const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ 
            message: 'JWT-токен не предоставлен',
        });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ 
            message: 'Некорректный формат JWT-токена',
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, jwtConfig.secret) as { currentUserId: number };
        req.currentUserId = decoded.currentUserId;
        next();
    } catch (error) {
        res.status(401).json({ 
            message: 'Недействительный JWT-токен' 
        });
    }
};


export const isAdmin = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const currentUserId = req.currentUserId!;
    const isUserAdmin = await AuthService.isUserAdmin(currentUserId);
    if (!isUserAdmin) {
        res.status(403).json({
            message: "Доступ только для администраторов"
        })
        return;
    };
    next();
};


export const isRecipeAuthor = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const currentUserId = req.currentUserId!;
    const { recipeId:recipeIdStr } = req.params;
    const recipeId = parseInt(recipeIdStr as string);
    const isUserRecipeAuthor = await RecipeService.isUserRecipeAuthor(currentUserId, recipeId);
    if (!isUserRecipeAuthor) {
        res.status(403).json({
            message: "Доступ только для автора рецепта"
        });
        return;
    }
    next();
};


export const isRecipeAuthorOrAdmin = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const currentUserId = req.currentUserId!;
    const { recipeId:recipeIdStr } = req.params;
    const recipeId = parseInt(recipeIdStr as string);
    if (!(RecipeService.isUserRecipeAuthor(currentUserId, recipeId) || AuthService.isUserAdmin(currentUserId))) {
        res.status(403).json({
            message: "Доступ только для автора рецепта и администраторов"
        })
        return;
    };
    next();
};
