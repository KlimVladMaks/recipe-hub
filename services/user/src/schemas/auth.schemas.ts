import { z } from 'zod'


export const RegisterRequestSchema = z.object({
    username: z.string(),
    password: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    about: z.string().optional()
})
export type RegisterRequestType = z.infer<typeof RegisterRequestSchema>
