import { z } from 'zod'

import { UserReadSchema } from './user.schemas';


export const RegisterRequestSchema = z.object({
    username: z.string(),
    password: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    about: z.string().optional()
})
export type RegisterRequestType = z.infer<typeof RegisterRequestSchema>


export const LoginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type LoginRequestType = z.infer<typeof LoginRequestSchema>;


export const LoginResponseSchema = z.object({
    user: UserReadSchema,
    jwtToken: z.string(),
})
export type LoginResponseType = z.infer<typeof LoginResponseSchema>;
