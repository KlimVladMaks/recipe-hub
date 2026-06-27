import { prisma } from '../config/database.js';
import type { CommentCreateType, CommentUpdateType } from '../schemas/index.js';

export class CommentService {
  static async isUserCommentAuthor(userId: number, commentId: number) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { userId: true } });
    return comment?.userId === userId;
  }

  static async isCorrectCommentId(commentId: number, recipeId: number) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { recipeId: true } });
    return comment?.recipeId === recipeId;
  }

  static async getComments(recipeId: number, page: number, limit: number) {
    const comments = await prisma.comment.findMany({
      where: { recipeId }, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
    });
    return Promise.all(comments.map(async (c) => ({
      id: c.id, text: c.text, createdAt: c.createdAt, updatedAt: c.updatedAt,
      user: await CommentService.fetchUser(c.userId),
    })));
  }

  static async createComment(recipeId: number, userId: number, data: CommentCreateType) {
    const comment = await prisma.comment.create({
      data: { text: data.text, recipeId, userId },
    });
    return {
      id: comment.id, text: comment.text, createdAt: comment.createdAt, updatedAt: comment.updatedAt,
      user: await CommentService.fetchUser(userId),
    };
  }

  static async getComment(commentId: number) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Комментарий не найден');
    return {
      id: comment.id, text: comment.text, createdAt: comment.createdAt, updatedAt: comment.updatedAt,
      user: await CommentService.fetchUser(comment.userId),
    };
  }

  static async updateComment(commentId: number, data: CommentUpdateType) {
    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) throw new Error('Комментарий не найден');
    const updated = await prisma.comment.update({ where: { id: commentId }, data: { text: data.text } });
    return {
      id: updated.id, text: updated.text, createdAt: updated.createdAt, updatedAt: updated.updatedAt,
      user: await CommentService.fetchUser(updated.userId),
    };
  }

  static async deleteComment(commentId: number) {
    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) throw new Error('Комментарий не найден');
    await prisma.comment.delete({ where: { id: commentId } });
  }

  static async isCommentLiked(commentId: number, userId: number) {
    const like = await prisma.commentLike.findUnique({ where: { userId_commentId: { userId, commentId } } });
    return { isLiked: !!like };
  }

  static async likeComment(commentId: number, userId: number) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Комментарий не найден');
    try {
      await prisma.commentLike.create({ data: { userId, commentId } });
    } catch (error: any) {
      if (error.code === 'P2002') return;
      throw error;
    }
  }

  static async unlikeComment(commentId: number, userId: number) {
    try {
      await prisma.commentLike.delete({ where: { userId_commentId: { userId, commentId } } });
    } catch (error: any) {
      if (error.code === 'P2025') return;
      throw error;
    }
  }

  private static async fetchUser(userId: number) {
    const host = process.env.AUTH_SERVICE_HOST || 'auth-service';
    const port = process.env.AUTH_SERVICE_PORT || '3001';
    try {
      const res = await fetch(`http://${host}:${port}/api/internal/users/${userId}`);
      if (res.ok) return res.json();
    } catch {}
    return { id: userId, username: 'unknown', firstName: '', lastName: '', about: null, role: 'user', createdAt: new Date(), updatedAt: new Date() };
  }
}