import { Router } from 'express'
import validate from 'express-zod-safe'
import { setGlobalOptions } from 'express-zod-safe';
import { authMiddleware } from '../middleware/auth.middleware';
import { DirectoryController } from '../controllers/directory.controller';
import { DishTypeCreateSchema } from '../schemas/directory.schemas';

setGlobalOptions({
    missingSchemaBehavior: 'any'
});

const directoryRouter = Router();

directoryRouter.get('/dish-types',
    authMiddleware,
    DirectoryController.getDishTypes
);

directoryRouter.post('/dish-types',
    authMiddleware,
    isAdmin,
    validate({
        body: DishTypeCreateSchema
    }),
    DirectoryController.addDishType
);

export default directoryRouter;
