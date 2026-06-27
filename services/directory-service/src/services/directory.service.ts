import { prisma } from '../config/database.js';
import type { DishTypeCreateType, DishTypeUpdateType, IngredientCreateType, IngredientUpdateType } from '../schemas/index.js';

export class DirectoryService {
  static async getDishTypes(search: string, page: number, limit: number) {
    const where: any = {};
    if (search.trim()) {
      where.title = { contains: search.trim(), mode: 'insensitive' };
    }
    return prisma.dishType.findMany({ where, skip: (page - 1) * limit, take: limit });
  }

  static async createDishType(data: DishTypeCreateType) {
    const existing = await prisma.dishType.findUnique({ where: { title: data.title } });
    if (existing) throw new Error('Тип блюда с таким названием уже существует');
    return prisma.dishType.create({ data: { title: data.title } });
  }

  static async getDishType(id: number) {
    const dt = await prisma.dishType.findUnique({ where: { id } });
    if (!dt) throw new Error('Тип блюда не найден');
    return dt;
  }

  static async updateDishType(id: number, data: DishTypeUpdateType) {
    await this.getDishType(id);
    return prisma.dishType.update({ where: { id }, data: { title: data.title } });
  }

  static async deleteDishType(id: number) {
    await this.getDishType(id);
    await prisma.dishType.delete({ where: { id } });
  }

  static async getIngredients(search: string, page: number, limit: number) {
    const where: any = {};
    if (search.trim()) {
      where.title = { contains: search.trim(), mode: 'insensitive' };
    }
    return prisma.ingredient.findMany({ where, skip: (page - 1) * limit, take: limit });
  }

  static async createIngredient(data: IngredientCreateType) {
    const existing = await prisma.ingredient.findUnique({ where: { title: data.title } });
    if (existing) throw new Error('Ингредиент с таким названием уже существует');
    return prisma.ingredient.create({ data: { title: data.title } });
  }

  static async getIngredient(id: number) {
    const ing = await prisma.ingredient.findUnique({ where: { id } });
    if (!ing) throw new Error('Ингредиент не найден');
    return ing;
  }

  static async updateIngredient(id: number, data: IngredientUpdateType) {
    await this.getIngredient(id);
    return prisma.ingredient.update({ where: { id }, data: { title: data.title } });
  }

  static async deleteIngredient(id: number) {
    await this.getIngredient(id);
    await prisma.ingredient.delete({ where: { id } });
  }
}