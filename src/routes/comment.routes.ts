import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { CommentController } from '../controllers/comment.controller.js';
import validate, { setGlobalOptions } from 'express-zod-safe';
import { CommentCreateSchema, CommentUpdateSchema } from '../schemas/comment.schemas.js';

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
    CommentController.getComment
);

commentRouter.patch('/recipes/:recipeId/comments/:commentId',
    authMiddleware,
    isCommentAuthor,
    validate({
        body: CommentUpdateSchema
    }),
    CommentController.updateComment
);

commentRouter.delete('/recipes/:recipeId/comments/:commentId',
    authMiddleware,
    isCommentAuthorOrAdmin,
    CommentController.deleteComment
);

commentRouter.get('/recipes/:recipeId/comments/:commentId/like',
    authMiddleware,
    CommentController.isCommentLiked
);

commentRouter.post('/recipes/:recipeId/comments/:commentId/like',
    authMiddleware,
    CommentController.likeComment
);

commentRouter.delete('/recipes/:recipeId/comments/:commentId/like',
    authMiddleware,
    CommentController.unlikeComment
);

export default commentRouter;
