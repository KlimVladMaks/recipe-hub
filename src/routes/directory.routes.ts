import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware.js';
import validate, { setGlobalOptions } from 'express-zod-safe';
import { 
    DishTypeCreateSchema, 
    DishTypeUpdateSchema, 
    IngredientCreateSchema,
    IngredientUpdateSchema
} from '../schemas/directory.schema.js';
import { DirectoryController } from '../controllers/directory.controller.js';

setGlobalOptions({
    missingSchemaBehavior: 'any'
});

const directoryRouter = Router()

directoryRouter.get('/dish-types',
    authMiddleware,
    DirectoryController.getDishTypes
);

directoryRouter.post('/dish-types',
    authMiddleware,
    validate({
        body: DishTypeCreateSchema
    }),
    DirectoryController.addDishType
);

directoryRouter.get('/dish-types/:dishTypeId',
    authMiddleware,
    DirectoryController.getDishType
);

directoryRouter.patch('/dish-types/:dishTypeId',
    authMiddleware,
    validate({
        body: DishTypeUpdateSchema
    }),
    DirectoryController.updateDishType
);

directoryRouter.delete('/dish-types/:dishTypeId',
    authMiddleware,
    DirectoryController.deleteDishType
);

directoryRouter.get('/ingredients',
    authMiddleware,
    DirectoryController.getIngredients
);

directoryRouter.post('/ingredients',
    authMiddleware,
    validate({
        body: IngredientCreateSchema
    }),
    DirectoryController.addIngredient
);

directoryRouter.get('/ingredients/:ingredientId',
    authMiddleware,
    DirectoryController.getIngredient
);

directoryRouter.patch('/ingredients/:ingredientId',
    authMiddleware,
    validate({
        body: IngredientUpdateSchema
    }),
    DirectoryController.updateIngredient
);

directoryRouter.delete('/ingredients/:ingredientId',
    authMiddleware,
    DirectoryController.deleteIngredient
);

export default directoryRouter;
