import { prisma } from "../config/database.js";
import type { DishTypeCreateType, DishTypeUpdateType } from "../schemas/directory.schema.js";

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

    static async getDishType(dishTypeId: number) {
        const dishType = await prisma.dishType.findUnique({
            where: { id: dishTypeId }
        });
        if (!dishType) {
            throw new Error('Тип блюда не найден');
        };
        return dishType;
    };

    static async updateDishType(dishTypeId: number, dishTypeUpdateData: DishTypeUpdateType) {
        const dishType = await prisma.dishType.findUnique({
            where: { id: dishTypeId }
        });
        if (!dishType) {
            throw new Error('Тип блюда не найден');
        };
        const { title } = dishTypeUpdateData;
        const updatedDishType = await prisma.dishType.update({
            where: { id: dishTypeId },
            data: { title }
        })
        return updatedDishType;
    };

    static async deleteDishType(dishTypeId: number) {
        const dishType = await prisma.dishType.findUnique({
            where: { id: dishTypeId }
        });
        if (!dishType) {
            throw new Error('Тип блюда не найден');
        };
        await prisma.dishType.delete({
            where: { id: dishTypeId }
        });
    };
}
