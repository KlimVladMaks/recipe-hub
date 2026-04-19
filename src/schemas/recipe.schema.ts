import { z } from 'zod'
import { 
    DishTypeReadListSchema, 
    IngredientReadListSchema 
} from './directory.schema.js';
import { UserReadSchema } from './user.schemas.js';


// ========== RecipeMedia ==========


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


// ========== StepMedia ==========


export const StepMediaReadSchema = z.object({
    id: z.number(),
    sortOrder: z.number(),
    mediaType: z.number(),
    mediaUrl: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type StepMediaReadType = z.infer<typeof StepMediaReadSchema>;


export const StepMediaReadListSchema = z.array(StepMediaReadSchema);
export type StepMediaReadListType = z.infer<typeof StepMediaReadListSchema>;


export const StepMediaCreateSchema = z.object({
    sortOrder: z.number(),
    mediaType: z.string(),
    mediaUrl: z.string(),
});
export type StepMediaCreateType = z.infer<typeof StepMediaCreateSchema>;


export const StepMediaCreateListSchema = z.array(StepMediaCreateSchema);
export type StepMediaCreateListType = z.infer<typeof StepMediaCreateListSchema>;


export const StepMediaUpdateSchema = z.object({
    sortOrder: z.number().optional(),
    mediaType: z.string().optional(),
    mediaUrl: z.string().optional(),
});
export type StepMediaUpdateType = z.infer<typeof StepMediaUpdateSchema>;


export const StepMediaUpdateListSchema = z.array(StepMediaUpdateSchema);
export type StepMediaUpdateListType = z.infer<typeof StepMediaUpdateListSchema>;


// ========== Step ==========


export const StepReadSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    media: StepMediaReadListSchema,
    description: z.string().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type StepReadType = z.infer<typeof StepReadSchema>;


export const StepReadListSchema = z.array(StepReadSchema);
export type StepReadListType = z.infer<typeof StepReadListSchema>;


export const StepCreateSchema = z.object({
    number: z.number(),
    title: z.string(),
    media: StepMediaCreateSchema.optional(),
    description: z.string().optional(),
});
export type StepCreateType = z.infer<typeof StepCreateSchema>;


export const StepUpdateSchema = z.object({
    number: z.number().optional(),
    title: z.string().optional(),
    media: StepMediaUpdateSchema.optional(),
    description: z.string().nullable().optional(),
});
export type StepUpdateType = z.infer<typeof StepUpdateSchema>;


// ========== Recipe ==========


export const RecipeReadSchema = z.object({
    id: z.number(),
    title: z.string(),
    dishTypes: DishTypeReadListSchema,
    ingredients: IngredientReadListSchema,
    description: z.string().nullable().optional(),
    media: RecipeMediaReadListSchema,
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
    media: RecipeMediaCreateListSchema.optional(),
    difficulty: z.string().optional(),
    isPublished: z.boolean(),
});
export type RecipeCreateType = z.infer<typeof RecipeCreateSchema>;


export const RecipeUpdateSchema = z.object({
    title: z.string().optional(),
    dishTypeIds: z.array(z.number()).optional(),
    ingredientIds: z.array(z.number()).optional(),
    description: z.string().optional(),
    media: RecipeMediaUpdateListSchema.optional(),
    difficulty: z.string().optional(),
    isPublished: z.boolean().optional(),
});
export type RecipeUpdateType = z.infer<typeof RecipeUpdateSchema>;


// ========== RecipeRating ==========


export const RecipeRatingReadSchema = z.object({
    avg_rating: z.number().nullable().optional(),
    rating_by_user: z.number().nullable().optional(),
});
export type RecipeRatingReadType = z.infer<typeof RecipeRatingReadSchema>;


export const RecipeRatingPutSchema = z.object({
    rating: z.number(),
});
export type RecipeRatingPutType = z.infer<typeof RecipeRatingPutSchema>;


// ========== SavedRecipe ==========


export const IsRecipeSavedReadSchema = z.object({
    isSaved: z.boolean(),
});
export type IsRecipeSavedReadType = z.infer<typeof IsRecipeSavedReadSchema>;
