import type { Response, NextFunction } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { ForbiddenError, NotFoundError, parseId, parseLimit, parsePage } from '../errors.js';
import { CommentService } from '../services/comment.service.js';
import {
    CommentReadSchema,
    IsCommentLikedReadSchema,
    PaginatedCommentsSchema,
    type CommentCreateType,
    type CommentUpdateType
} from '../schemas/comment.schemas.js';
import { isAdmin } from '../services/userServiceClient.js';


export class CommentController {
    static async getComments(req: AuthRequest, res: Response) {
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const page = parsePage(req.query.page);
        const limit = parseLimit(req.query.limit);
        const comments = await CommentService.getComments(recipeId, page, limit);
        res.status(200).json(PaginatedCommentsSchema.parse(comments));
    };

    static async addComment(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const commentCreateData: CommentCreateType = req.body;
        const comment = await CommentService.createComment(recipeId, currentUserId, commentCreateData);
        res.status(201).json(CommentReadSchema.parse(comment));
    };

    static async getComment(req: AuthRequest, res: Response) {
        const commentId = parseId(req.params.commentId, 'commentId');
        const comment = await CommentService.getComment(commentId);
        res.status(200).json(CommentReadSchema.parse(comment));
    };

    static async updateComment(req: AuthRequest, res: Response) {
        const commentId = parseId(req.params.commentId, 'commentId');
        const commentUpdateData: CommentUpdateType = req.body;
        const comment = await CommentService.updateComment(commentId, commentUpdateData);
        res.status(200).json(CommentReadSchema.parse(comment));
    };

    static async deleteComment(req: AuthRequest, res: Response) {
        const commentId = parseId(req.params.commentId, 'commentId');
        await CommentService.deleteComment(commentId);
        res.status(204).send();
    };

    static async isCommentLiked(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const commentId = parseId(req.params.commentId, 'commentId');
        const isCommentLiked = await CommentService.isCommentLiked(commentId, currentUserId);
        res.status(200).json(IsCommentLikedReadSchema.parse(isCommentLiked));
    };

    static async likeComment(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const commentId = parseId(req.params.commentId, 'commentId');
        await CommentService.likeComment(commentId, currentUserId);
        res.status(200).send();
    };

    static async unlikeComment(req: AuthRequest, res: Response) {
        const currentUserId = req.currentUserId!;
        const commentId = parseId(req.params.commentId, 'commentId');
        await CommentService.unlikeComment(commentId, currentUserId);
        res.status(204).send();
    };

    // Middleware для проверки автора комментария
    static async isCommentAuthor(req: AuthRequest, _res: Response, next: NextFunction) {
        const currentUserId = req.currentUserId!;
        const commentId = parseId(req.params.commentId, 'commentId');
        const isAuthor = await CommentService.isUserCommentAuthor(currentUserId, commentId);
        if (!isAuthor) {
            next(new ForbiddenError('Доступ только для автора комментария'));
            return;
        }
        next();
    };

    // Middleware для проверки автора комментария или администратора
    static async isCommentAuthorOrAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
        const currentUserId = req.currentUserId!;
        const commentId = parseId(req.params.commentId, 'commentId');
        const [isAuthor, userIsAdmin] = await Promise.all([
            CommentService.isUserCommentAuthor(currentUserId, commentId),
            isAdmin(currentUserId),
        ]);
        if (!(isAuthor || userIsAdmin)) {
            next(new ForbiddenError('Доступ только для автора комментария и администраторов'));
            return;
        }
        next();
    };

    // Middleware для проверки, что commentId принадлежит recipeId
    static async isCorrectCommentId(req: AuthRequest, _res: Response, next: NextFunction) {
        const recipeId = parseId(req.params.recipeId, 'recipeId');
        const commentId = parseId(req.params.commentId, 'commentId');
        const isCorrect = await CommentService.isCorrectCommentId(commentId, recipeId);
        if (!isCorrect) {
            next(new NotFoundError('Комментарий не относится к указанному рецепту'));
            return;
        }
        next();
    };
};
