import { Router } from 'express'
import validate from 'express-zod-safe'

import { changePasswordRequestSchema, loginRequestSchema, registerRequestSchema } from './schemas/auth.schemas.js'
import { AuthController } from './controllers/auth.controller.js'
import { authMiddleware } from './middlewares/auth.middleware.js'

const router = Router()

router.post('/auth/register',
    validate({ 
        body: registerRequestSchema 
    }),
    AuthController.register
)

router.post('/auth/login',
    validate({
        body: loginRequestSchema
    }),
    AuthController.login
)

router.patch('/users/me/password',
    authMiddleware,
    validate({
        body: changePasswordRequestSchema
    }),
    AuthController.changePassword
)

export default router
