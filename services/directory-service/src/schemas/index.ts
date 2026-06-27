import { z } from 'zod';

export const DishTypeReadSchema = z.object({ id: z.number(), title: z.string() });
export const DishTypeReadListSchema = z.array(DishTypeReadSchema);
export const DishTypeCreateSchema = z.object({ title: z.string() });
export type DishTypeCreateType = z.infer<typeof DishTypeCreateSchema>;
export const DishTypeUpdateSchema = z.object({ title: z.string() });
export type DishTypeUpdateType = z.infer<typeof DishTypeUpdateSchema>;

export const IngredientReadSchema = z.object({ id: z.number(), title: z.string() });
export const IngredientReadListSchema = z.array(IngredientReadSchema);
export const IngredientCreateSchema = z.object({ title: z.string() });
export type IngredientCreateType = z.infer<typeof IngredientCreateSchema>;
export const IngredientUpdateSchema = z.object({ title: z.string() });
export type IngredientUpdateType = z.infer<typeof IngredientUpdateSchema>;