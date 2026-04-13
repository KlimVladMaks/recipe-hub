import { z } from 'zod'
import { userReadSchema } from './user.schemas.js';


export const registerRequestSchema = z.object({
    username: z.string(),
    password: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    about: z.string().optional()
})
export type RegisterRequestType = z.infer<typeof registerRequestSchema>


export const loginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type LoginRequestType = z.infer<typeof loginRequestSchema>;


export const changePasswordRequestSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string(),
});
export type ChangePasswordRequestType = z.infer<typeof changePasswordRequestSchema>;


export const loginResponseSchema = z.object({
    user: userReadSchema,
    jwtToken: z.string(),
})
export type LoginResponseType = z.infer<typeof loginResponseSchema>;
