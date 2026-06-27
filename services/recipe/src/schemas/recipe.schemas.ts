import { z } from 'zod'
import { 
    DishTypeReadListSchema, 
    IngredientReadListSchema 
} from './directory.schemas.js';
import { UserReadSchema } from './user.schemas.js';


export const RecipeReadSchema = z.object({
    id: z.number(),
    title: z.string(),
    dishTypes: DishTypeReadListSchema,
    ingredients: IngredientReadListSchema,
    description: z.string().nullable().optional(),
    media: z.array(z.object({
        id: z.number(),
        sortOrder: z.number(),
        mediaType: z.string(),
        mediaUrl: z.string(),
        createdAt: z.date(),
        updatedAt: z.date(),
    })),
    difficulty: z.string().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    isPublished: z.boolean(),
    author: UserReadSchema,
});
export type RecipeReadType = z.infer<typeof RecipeReadSchema>;


export const RecipeReadListSchema = z.array(RecipeReadSchema);
export type RecipeReadListType = z.infer<typeof RecipeReadListSchema>;


export const RecipeCreateSchema = z.object({
    title: z.string(),
    dishTypeIds: z.array(z.number()).optional(),
    ingredientIds: z.array(z.number()).optional(),
    description: z.string().optional(),
    media: z.array(z.object({
        sortOrder: z.number(),
        mediaType: z.string(),
        mediaUrl: z.string(),
    })).optional(),
    difficulty: z.string().optional(),
    isPublished: z.boolean(),
});
export type RecipeCreateType = z.infer<typeof RecipeCreateSchema>;


export const RecipeUpdateSchema = z.object({
    title: z.string().optional(),
    dishTypeIds: z.array(z.number()).optional(),
    ingredientIds: z.array(z.number()).optional(),
    description: z.string().optional(),
    media: z.array(z.object({
        sortOrder: z.number().optional(),
        mediaType: z.string().optional(),
        mediaUrl: z.string().optional(),
    })).optional(),
    difficulty: z.string().optional(),
    isPublished: z.boolean().optional(),
});
export type RecipeUpdateType = z.infer<typeof RecipeUpdateSchema>;


export const RecipeRatingReadSchema = z.object({
    avg_rating: z.number().nullable().optional(),
    rating_by_user: z.number().nullable().optional(),
});
export type RecipeRatingReadType = z.infer<typeof RecipeRatingReadSchema>;


export const RecipeRatingPutSchema = z.object({
    rating: z.number().min(1).max(10),
});
export type RecipeRatingPutType = z.infer<typeof RecipeRatingPutSchema>;


export const IsRecipeSavedReadSchema = z.object({
    isSaved: z.boolean(),
});
export type IsRecipeSavedReadType = z.infer<typeof IsRecipeSavedReadSchema>;
