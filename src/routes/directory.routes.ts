import { Router } from 'express'

const directoryRouter = Router()

directoryRouter.get('/dish-types');

directoryRouter.post('/dish-types');

directoryRouter.get('/dish-types/:dishTypeId(\\d+)');

directoryRouter.patch('/dish-types/:dishTypeId(\\d+)');

directoryRouter.delete('/dish-types/:dishTypeId(\\d+)');

directoryRouter.get('/ingredients');

directoryRouter.post('/ingredients');

directoryRouter.get('/ingredients/:ingredientId(\\d+)');

directoryRouter.patch('/ingredients/:ingredientId(\\d+)');

directoryRouter.delete('/ingredients/:ingredientId(\\d+)');

export default directoryRouter;
