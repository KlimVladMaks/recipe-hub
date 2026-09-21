import { Router } from 'express';
import validate from 'express-zod-safe';

import '../validation.js'
import { authMiddleware } from '../middleware/auth.middleware.js';
import { CommentController } from '../controllers/comment.controller.js';
import { CommentCreateSchema, CommentUpdateSchema } from '../schemas/comment.schemas.js';

const commentRouter = Router();

commentRouter.get('/recipes/:recipeId/comments',
    authMiddleware,
    CommentController.getComments
);

commentRouter.post('/recipes/:recipeId/comments',
    authMiddleware,
    validate({
        body: CommentCreateSchema
    }),
    CommentController.addComment
);

commentRouter.get('/recipes/:recipeId/comments/:commentId',
    authMiddleware,
    CommentController.isCorrectCommentId,
    CommentController.getComment
);

commentRouter.patch('/recipes/:recipeId/comments/:commentId',
    authMiddleware,
    CommentController.isCorrectCommentId,
    CommentController.isCommentAuthor,
    validate({
        body: CommentUpdateSchema
    }),
    CommentController.updateComment
);

commentRouter.delete('/recipes/:recipeId/comments/:commentId',
    authMiddleware,
    CommentController.isCorrectCommentId,
    CommentController.isCommentAuthorOrAdmin,
    CommentController.deleteComment
);

commentRouter.get('/recipes/:recipeId/comments/:commentId/like',
    authMiddleware,
    CommentController.isCorrectCommentId,
    CommentController.isCommentLiked
);

commentRouter.post('/recipes/:recipeId/comments/:commentId/like',
    authMiddleware,
    CommentController.isCorrectCommentId,
    CommentController.likeComment
);

commentRouter.delete('/recipes/:recipeId/comments/:commentId/like',
    authMiddleware,
    CommentController.isCorrectCommentId,
    CommentController.unlikeComment
);

export default commentRouter;
