import { prisma } from "../config/database";
import { DishTypeCreateType } from "../schemas/directory.schemas";


export class DirectoryService {
    static async getDishTypes(search: string, page: number, limit: number) {
        const whereCondition: any = {};
        if (search.trim().length > 0) {
            whereCondition.title = {
                contains: search.trim(),
                mode: 'insensitive'
            };
        };
        const skip = (page - 1) * limit;
        const dishTypes = await prisma.dishType.findMany({
            skip: skip,
            take: limit,
            where: whereCondition
        });
        return dishTypes;
    };

    static async createDishType(dishTypeCreateData: DishTypeCreateType) {
        const { title } = dishTypeCreateData;
        const existingDishType = await prisma.dishType.findUnique({
            where: { title },
        });
        if (existingDishType) {
            throw new Error('Тип блюда с таким названием уже существует');
        };
        const dishType = await prisma.dishType.create({
            data: {
                title
            }
        });
        return dishType;
    };
};
