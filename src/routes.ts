import { Router } from 'express'
import validate from 'express-zod-safe'

import { registerRequestSchema } from './schemas/auth.schemas.js'
import { AuthController } from './controllers/auth.controller.js'

const router = Router()

router.post('/auth/register',
    validate({ 
        body: registerRequestSchema 
    }),
    AuthController.register
)

export default router
