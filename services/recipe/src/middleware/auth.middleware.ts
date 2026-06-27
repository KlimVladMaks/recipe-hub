import type { Request, Response, NextFunction } from 'express';

import { config } from '../config';
import { RecipeService } from '../services/recipe.service';
import { CommentService } from '../services/comment.service';
import { StepService } from '../services/step.service';


export interface AuthRequest extends Request {
    currentUserId?: number;
}


export const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const currentUserId = req.headers[config.xUserId];
    if (currentUserId) {
        req.currentUserId = Number(currentUserId);
        next();
    } else {
        res.status(500).json({ 
            message: 'user-service: Нет заголовка x-user-id' 
        });
    }
}


export const isAdmin = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const userRole = req.headers[config.xUserRole];
    if (userRole != "admin") {
        res.status(403).json({
            message: "Доступ только для администраторов"
        })
        return;
    };
    next();
}


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


export const isRecipeAuthorOrAdmin = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const currentUserId = req.currentUserId!;
    const userRole = req.headers[config.xUserRole];
    const { recipeId:recipeIdStr } = req.params;
    const recipeId = parseInt(recipeIdStr as string);
    const isRecipeAuthor = await RecipeService.isUserRecipeAuthor(currentUserId, recipeId);
    const isAdminUser = userRole === "admin";
    if (!(isRecipeAuthor || isAdminUser)) {
        res.status(403).json({
            message: "Доступ только для автора рецепта и администраторов"
        })
        return;
    };
    next();
};


export const isCommentAuthor = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const currentUserId = req.currentUserId!;
    const { commentId:commentIdStr } = req.params;
    const commentId = parseInt(commentIdStr as string);
    const isCommentAuthor = await CommentService.isUserCommentAuthor(currentUserId, commentId);
    if (!isCommentAuthor) {
        res.status(403).json({
            message: "Доступ только для автора комментария"
        });
        return;
    }
    next();
};


export const isCommentAuthorOrAdmin = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const currentUserId = req.currentUserId!;
    const userRole = req.headers[config.xUserRole];
    const { commentId:commentIdStr } = req.params;
    const commentId = parseInt(commentIdStr as string);
    const isCommentAuthor = await CommentService.isUserCommentAuthor(currentUserId, commentId);
    const isAdminUser = userRole === "admin";
    if (!(isCommentAuthor || isAdminUser)) {
        res.status(403).json({
            message: "Доступ только для автора комментария и администраторов"
        })
        return;
    };
    next();
};


export const isCorrectCommentId = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const { recipeId: recipeIdStr, commentId: commentIdStr } = req.params;
    const recipeId = parseInt(recipeIdStr as string);
    const commentId = parseInt(commentIdStr as string);
    const isValid = await CommentService.isCorrectCommentId(commentId, recipeId);
    if (!isValid) {
        res.status(400).json({
            message: "Данный комментарий не принадлежит данному рецепту"
        });
        return;
    }
    next();
};


export const isCorrectStepId = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const { recipeId: recipeIdStr, stepId: stepIdStr } = req.params;
    const recipeId = parseInt(recipeIdStr as string);
    const stepId = parseInt(stepIdStr as string);
    const isValid = await StepService.isCorrectStepId(stepId, recipeId);
    if (!isValid) {
        res.status(400).json({
            message: "Данный шаг не принадлежит данному рецепту"
        });
        return;
    }
    next();
};
