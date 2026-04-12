import { z } from 'zod'


export const userReadSchema = z.object({
    id: z.number(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    about: z.string().optional(),
    role: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
})
