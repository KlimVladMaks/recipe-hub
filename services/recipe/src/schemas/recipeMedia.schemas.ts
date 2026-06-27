import { z } from 'zod'


export const RecipeMediaReadSchema = z.object({
    id: z.number(),
    sortOrder: z.number(),
    mediaType: z.string(),
    mediaUrl: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type RecipeMediaReadType = z.infer<typeof RecipeMediaReadSchema>;


export const RecipeMediaReadListSchema = z.array(RecipeMediaReadSchema);
export type RecipeMediaReadListType = z.infer<typeof RecipeMediaReadListSchema>;


export const RecipeMediaCreateSchema = z.object({
    sortOrder: z.number(),
    mediaType: z.string(),
    mediaUrl: z.string(),
});
export type RecipeMediaCreateType = z.infer<typeof RecipeMediaCreateSchema>;


export const RecipeMediaCreateListSchema = z.array(RecipeMediaCreateSchema);
export type RecipeMediaCreateListType = z.infer<typeof RecipeMediaCreateListSchema>;


export const RecipeMediaUpdateSchema = z.object({
    sortOrder: z.number().optional(),
    mediaType: z.string().optional(),
    mediaUrl: z.string().optional(),
});
export type RecipeMediaUpdateType = z.infer<typeof RecipeMediaUpdateSchema>;


export const RecipeMediaUpdateListSchema = z.array(RecipeMediaUpdateSchema);
export type RecipeMediaUpdateListType = z.infer<typeof RecipeMediaUpdateListSchema>;
