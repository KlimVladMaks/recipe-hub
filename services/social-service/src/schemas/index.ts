import { z } from 'zod';

export const UserReadSchema = z.object({
  id: z.number(), username: z.string(), firstName: z.string(), lastName: z.string(),
  about: z.string().nullable(), role: z.string(), createdAt: z.date(), updatedAt: z.date(),
});
export const UserReadListSchema = z.array(UserReadSchema);

export const CommentReadSchema = z.object({
  id: z.number(), user: UserReadSchema, text: z.string(), createdAt: z.date(), updatedAt: z.date(),
});
export type CommentReadType = z.infer<typeof CommentReadSchema>;
export const CommentReadListSchema = z.array(CommentReadSchema);

export const CommentCreateSchema = z.object({ text: z.string() });
export type CommentCreateType = z.infer<typeof CommentCreateSchema>;

export const CommentUpdateSchema = z.object({ text: z.string() });
export type CommentUpdateType = z.infer<typeof CommentUpdateSchema>;

export const IsCommentLikedReadSchema = z.object({ isLiked: z.boolean() });

export const IsSubscribedToUserReadSchema = z.object({ isSubscribed: z.boolean() });

// Recipe schema for feed
export const DishTypeReadSchema = z.object({ id: z.number(), title: z.string() });
export const DishTypeReadListSchema = z.array(DishTypeReadSchema);
export const IngredientReadSchema = z.object({ id: z.number(), title: z.string() });
export const IngredientReadListSchema = z.array(IngredientReadSchema);
export const RecipeMediaReadSchema = z.object({
  id: z.number(), sortOrder: z.number(), mediaType: z.string(), mediaUrl: z.string(),
  createdAt: z.date(), updatedAt: z.date(),
});
export const RecipeMediaReadListSchema = z.array(RecipeMediaReadSchema);

export const RecipeReadSchema = z.object({
  id: z.number(), title: z.string(), dishTypes: DishTypeReadListSchema,
  ingredients: IngredientReadListSchema, description: z.string().nullable().optional(),
  media: RecipeMediaReadListSchema, difficulty: z.string().nullable().optional(),
  createdAt: z.date(), updatedAt: z.date(), isPublished: z.boolean(),
  author: UserReadSchema,
});
export const RecipeReadListSchema = z.array(RecipeReadSchema);