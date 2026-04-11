import { z } from 'zod'

export const registerRequestSchema = z.object({
    username: z.string(),
    password: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    about: z.string().optional()
})
export type RegisterRequestType = z.infer<typeof registerRequestSchema>
