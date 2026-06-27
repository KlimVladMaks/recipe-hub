import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { CommentService } from '../services/comment.service.js';
import {
  CommentReadSchema, CommentReadListSchema, IsCommentLikedReadSchema,
  type CommentCreateType, type CommentUpdateType,
} from '../schemas/index.js';

export class CommentController {
  static async getComments(req: AuthRequest, res: Response) {
    try {
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '20');
      const recipeId = parseInt(req.params.recipeId);
      const comments = await CommentService.getComments(recipeId, page, limit);
      res.json(CommentReadListSchema.parse(comments));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async addComment(req: AuthRequest, res: Response) {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const data: CommentCreateType = req.body;
      const comment = await CommentService.createComment(recipeId, req.currentUserId!, data);
      res.status(201).json(CommentReadSchema.parse(comment));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async getComment(req: AuthRequest, res: Response) {
    try {
      const commentId = parseInt(req.params.commentId);
      const comment = await CommentService.getComment(commentId);
      res.json(CommentReadSchema.parse(comment));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async updateComment(req: AuthRequest, res: Response) {
    try {
      const commentId = parseInt(req.params.commentId);
      const data: CommentUpdateType = req.body;
      const comment = await CommentService.updateComment(commentId, data);
      res.json(CommentReadSchema.parse(comment));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async deleteComment(req: AuthRequest, res: Response) {
    try {
      const commentId = parseInt(req.params.commentId);
      await CommentService.deleteComment(commentId);
      res.status(204).send();
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async isCommentLiked(req: AuthRequest, res: Response) {
    try {
      const commentId = parseInt(req.params.commentId);
      const result = await CommentService.isCommentLiked(commentId, req.currentUserId!);
      res.json(IsCommentLikedReadSchema.parse(result));
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async likeComment(req: AuthRequest, res: Response) {
    try {
      const commentId = parseInt(req.params.commentId);
      await CommentService.likeComment(commentId, req.currentUserId!);
      res.status(200).send();
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }

  static async unlikeComment(req: AuthRequest, res: Response) {
    try {
      const commentId = parseInt(req.params.commentId);
      await CommentService.unlikeComment(commentId, req.currentUserId!);
      res.status(204).send();
    } catch (error: any) { res.status(400).json({ message: error.message }); }
  }
}