import { Router } from 'express'
import validate from 'express-zod-safe'

import { 
    ChangePasswordRequestSchema, 
    LoginRequestSchema, 
    RegisterRequestSchema 
} from '../schemas/auth.schemas.js'
import { AuthController } from '../controllers/auth.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'

const authRouter = Router()

authRouter.post('/auth/register',
    validate({ 
        body: RegisterRequestSchema 
    }),
    AuthController.register
);

authRouter.post('/auth/login',
    validate({
        body: LoginRequestSchema
    }),
    AuthController.login
);

authRouter.patch('/users/me/password',
    authMiddleware,
    validate({
        body: ChangePasswordRequestSchema
    }),
    AuthController.changePassword
);

export default authRouter;
