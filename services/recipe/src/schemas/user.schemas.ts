import { z } from 'zod'


export const UserReadSchema = z.object({
    id: z.number(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    about: z.string().nullable(),
    role: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type UserReadType = z.infer<typeof UserReadSchema>;


export const UserReadListSchema = z.array(UserReadSchema);
export type UserReadListType = z.infer<typeof UserReadListSchema>;