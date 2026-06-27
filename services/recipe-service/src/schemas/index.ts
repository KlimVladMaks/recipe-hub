import { z } from 'zod';

export const DishTypeReadSchema = z.object({ id: z.number(), title: z.string() });
export const DishTypeReadListSchema = z.array(DishTypeReadSchema);
export const IngredientReadSchema = z.object({ id: z.number(), title: z.string() });
export const IngredientReadListSchema = z.array(IngredientReadSchema);

export const RecipeMediaReadSchema = z.object({
  id: z.number(), sortOrder: z.number(), mediaType: z.string(), mediaUrl: z.string(),
  createdAt: z.date(), updatedAt: z.date(),
});
export const RecipeMediaReadListSchema = z.array(RecipeMediaReadSchema);
export const RecipeMediaCreateSchema = z.object({ sortOrder: z.number(), mediaType: z.string(), mediaUrl: z.string() });
export const RecipeMediaCreateListSchema = z.array(RecipeMediaCreateSchema);
export const RecipeMediaUpdateSchema = z.object({ sortOrder: z.number().optional(), mediaType: z.string().optional(), mediaUrl: z.string().optional() });
export const RecipeMediaUpdateListSchema = z.array(RecipeMediaUpdateSchema);

export const UserReadSchema = z.object({
  id: z.number(), username: z.string(), firstName: z.string(), lastName: z.string(),
  about: z.string().nullable(), role: z.string(), createdAt: z.date(), updatedAt: z.date(),
});

export const RecipeReadSchema = z.object({
  id: z.number(), title: z.string(), dishTypes: DishTypeReadListSchema,
  ingredients: IngredientReadListSchema, description: z.string().nullable().optional(),
  media: RecipeMediaReadListSchema, difficulty: z.string().nullable().optional(),
  createdAt: z.date(), updatedAt: z.date(), isPublished: z.boolean(),
  author: UserReadSchema,
});
export type RecipeReadType = z.infer<typeof RecipeReadSchema>;
export const RecipeReadListSchema = z.array(RecipeReadSchema);

export const RecipeCreateSchema = z.object({
  title: z.string(), dishTypeIds: z.array(z.number()).optional(),
  ingredientIds: z.array(z.number()).optional(), description: z.string().optional(),
  media: RecipeMediaCreateListSchema.optional(), difficulty: z.string().optional(),
  isPublished: z.boolean(),
});
export type RecipeCreateType = z.infer<typeof RecipeCreateSchema>;

export const RecipeUpdateSchema = z.object({
  title: z.string().optional(), dishTypeIds: z.array(z.number()).optional(),
  ingredientIds: z.array(z.number()).optional(), description: z.string().optional(),
  media: RecipeMediaUpdateListSchema.optional(), difficulty: z.string().optional(),
  isPublished: z.boolean().optional(),
});
export type RecipeUpdateType = z.infer<typeof RecipeUpdateSchema>;

export const RecipeRatingReadSchema = z.object({
  avg_rating: z.number().nullable().optional(),
  rating_by_user: z.number().nullable().optional(),
});
export const RecipeRatingPutSchema = z.object({ rating: z.number().min(1).max(10) });
export type RecipeRatingPutType = z.infer<typeof RecipeRatingPutSchema>;

export const IsRecipeSavedReadSchema = z.object({ isSaved: z.boolean() });

// Step schemas
export const StepMediaReadSchema = z.object({
  sortOrder: z.number(), mediaType: z.string(), mediaUrl: z.string(),
  createdAt: z.date(), updatedAt: z.date(),
});
export const StepMediaReadListSchema = z.array(StepMediaReadSchema);
export const StepMediaCreateSchema = z.object({ sortOrder: z.number(), mediaType: z.string(), mediaUrl: z.string() });
export const StepMediaCreateListSchema = z.array(StepMediaCreateSchema);
export const StepMediaUpdateSchema = z.object({ sortOrder: z.number().optional(), mediaType: z.string().optional(), mediaUrl: z.string().optional() });
export const StepMediaUpdateListSchema = z.array(StepMediaUpdateSchema);

export const StepReadSchema = z.object({
  id: z.number(), number: z.number(), title: z.string(),
  media: StepMediaReadListSchema, description: z.string().nullable().optional(),
  createdAt: z.date(), updatedAt: z.date(),
});
export type StepReadType = z.infer<typeof StepReadSchema>;
export const StepReadListSchema = z.array(StepReadSchema);

export const StepCreateSchema = z.object({
  number: z.number(), title: z.string(),
  media: StepMediaCreateListSchema.optional(), description: z.string().optional(),
});
export type StepCreateType = z.infer<typeof StepCreateSchema>;

export const StepUpdateSchema = z.object({
  number: z.number().optional(), title: z.string().optional(),
  media: StepMediaUpdateListSchema.optional(), description: z.string().nullable().optional(),
});
export type StepUpdateType = z.infer<typeof StepUpdateSchema>;