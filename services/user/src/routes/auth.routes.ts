import { Router } from 'express'
import validate from 'express-zod-safe'
import { setGlobalOptions } from 'express-zod-safe';

import { RegisterRequestSchema } from '../schemas/auth.schemas';
import { AuthController } from '../controllers/auth.controller';

setGlobalOptions({
    missingSchemaBehavior: 'any'
});

const authRouter = Router()

authRouter.post('/auth/register',
    validate({ 
        body: RegisterRequestSchema 
    }),
    AuthController.register
);

export default authRouter;
