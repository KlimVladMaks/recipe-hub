import { Router } from 'express'
import validate from 'express-zod-safe'

import { loginRequestSchema, registerRequestSchema } from './schemas/auth.schemas.js'
import { AuthController } from './controllers/auth.controller.js'

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

export default router
