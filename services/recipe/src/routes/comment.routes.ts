import { Router } from 'express';
import { authMiddleware, isCommentAuthor, isCommentAuthorOrAdmin } from '../middleware/auth.middleware';
import { CommentController } from '../controllers/comment.controller';
import validate, { setGlobalOptions } from 'express-zod-safe';
import { CommentCreateSchema, CommentUpdateSchema } from '../schemas/comment.schemas';
import { isCorrectCommentId } from '../middleware/auth.middleware';

setGlobalOptions({
    missingSchemaBehavior: 'any'
});

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
    isCorrectCommentId,
    CommentController.getComment
);

commentRouter.patch('/recipes/:recipeId/comments/:commentId',
    authMiddleware,
    isCorrectCommentId,
    isCommentAuthor,
    validate({
        body: CommentUpdateSchema
    }),
    CommentController.updateComment
);

commentRouter.delete('/recipes/:recipeId/comments/:commentId',
    authMiddleware,
    isCorrectCommentId,
    isCommentAuthorOrAdmin,
    CommentController.deleteComment
);

commentRouter.get('/recipes/:recipeId/comments/:commentId/like',
    authMiddleware,
    isCorrectCommentId,
    CommentController.isCommentLiked
);

commentRouter.post('/recipes/:recipeId/comments/:commentId/like',
    authMiddleware,
    isCorrectCommentId,
    CommentController.likeComment
);

commentRouter.delete('/recipes/:recipeId/comments/:commentId/like',
    authMiddleware,
    isCorrectCommentId,
    CommentController.unlikeComment
);

export default commentRouter;