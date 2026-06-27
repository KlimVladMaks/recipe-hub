import { Router } from 'express';
import { authMiddleware, isCommentAuthor, isCommentAuthorOrAdmin } from '../middlewares/auth.middleware.js';
import { CommentController } from '../controllers/comment.controller.js';
import { SubscriptionController } from '../controllers/subscription.controller.js';

const router = Router();

// Comments
router.get('/recipes/:recipeId/comments', authMiddleware, CommentController.getComments);
router.post('/recipes/:recipeId/comments', authMiddleware, CommentController.addComment);
router.get('/recipes/:recipeId/comments/:commentId', authMiddleware, CommentController.getComment);
router.patch('/recipes/:recipeId/comments/:commentId', authMiddleware, isCommentAuthor, CommentController.updateComment);
router.delete('/recipes/:recipeId/comments/:commentId', authMiddleware, isCommentAuthorOrAdmin, CommentController.deleteComment);
router.get('/recipes/:recipeId/comments/:commentId/like', authMiddleware, CommentController.isCommentLiked);
router.post('/recipes/:recipeId/comments/:commentId/like', authMiddleware, CommentController.likeComment);
router.delete('/recipes/:recipeId/comments/:commentId/like', authMiddleware, CommentController.unlikeComment);

// Subscriptions
router.get('/users/me/subscriptions', authMiddleware, SubscriptionController.getCurrentUserSubscriptions);
router.get('/users/me/subscribers', authMiddleware, SubscriptionController.getCurrentUserSubscribers);
router.get('/users/me/feed', authMiddleware, SubscriptionController.getFeed);
router.get('/users/:userId/subscribe', authMiddleware, SubscriptionController.isSubscribed);
router.post('/users/:userId/subscribe', authMiddleware, SubscriptionController.subscribe);
router.delete('/users/:userId/subscribe', authMiddleware, SubscriptionController.unsubscribe);
router.get('/users/:userId/subscriptions', authMiddleware, SubscriptionController.getUserSubscriptions);
router.get('/users/:userId/subscribers', authMiddleware, SubscriptionController.getUserSubscribers);

export default router;