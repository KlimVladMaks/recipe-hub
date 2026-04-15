import { Router } from 'express';
import validate from 'express-zod-safe'

import { authMiddleware } from '../middlewares/auth.middleware.js'
import { 
    UserUpdateSchema,
    UserRoleUpdateSchema,
 } from '../schemas/user.schemas.js';
import { UserController } from '../controllers/user.controller.js';

const userRouter = Router();

userRouter.get('/users',
    authMiddleware,
    UserController.getUsers,
);

userRouter.get('/users/me',
    authMiddleware,
    UserController.getCurrentUser,
);

userRouter.patch('/users/me',
    authMiddleware,
    validate({
        body: UserUpdateSchema
    }),
    UserController.updateCurrentUser,
);

userRouter.delete('/users/me',
    authMiddleware,
    UserController.deleteCurrentUsers,
);

userRouter.get('/users/:userId(\\d+)',
    authMiddleware,
    UserController.getUser,
);

userRouter.delete('/users/:userId(\\d+)',
    authMiddleware,
    UserController.deleteUser,
);

userRouter.patch('/users/:userId(\\d+)/role',
    authMiddleware,
    validate({
        body: UserRoleUpdateSchema
    }),
    UserController.updateUserRole,
);

export default userRouter;
