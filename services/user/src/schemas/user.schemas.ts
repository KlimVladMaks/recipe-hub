import { z } from 'zod'

export const RoleSchema = z.enum(['user', 'admin']);
export type RoleType = z.infer<typeof RoleSchema>;

export const UserReadSchema = z.object({
    id: z.number(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    about: z.string().nullable(),
    role: RoleSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type UserReadType = z.infer<typeof UserReadSchema>;


export const PaginatedUsersSchema = z.object({
    items: z.array(UserReadSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
});
export type PaginatedUsersType = z.infer<typeof PaginatedUsersSchema>;


export const UserUpdateSchema = z.object({
    username: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    about: z.string().nullable().optional(),
});
export type UserUpdateType = z.infer<typeof UserUpdateSchema>;


export const UserRoleUpdateSchema = z.object({
    role: RoleSchema,
});
export type UserRoleUpdateType = z.infer<typeof UserRoleUpdateSchema>;
