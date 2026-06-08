import { AuthRequest } from '../middleware/auth.middleware';
import { Response } from 'express'
import { DirectoryService } from '../services/directory.service';
import { 
    DishTypeCreateType, 
    DishTypeReadListSchema, 
    DishTypeReadSchema 
} from '../schemas/directory.schemas';


export class DirectoryController {
    static async getDishTypes(req: AuthRequest, res: Response) {
        try {
            const { 
                page:pageStr='1', 
                limit:limitStr='20',
                search='',
            } = req.query;
            const page = parseInt(pageStr as string);
            const limit = parseInt(limitStr as string);
            const dishTypes = await DirectoryService.getDishTypes(search as string, page, limit);
            res.status(200).json(DishTypeReadListSchema.parse(dishTypes));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };

    static async addDishType(req: AuthRequest, res: Response) {
        try {
            const dishTypeCreateData: DishTypeCreateType = req.body;
            const dishType = await DirectoryService.createDishType(dishTypeCreateData);
            res.status(201).json(DishTypeReadSchema.parse(dishType));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };
};
