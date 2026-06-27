import { z } from 'zod';

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

export const RegisterRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  about: z.string().optional(),
});
export type RegisterRequestType = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type LoginRequestType = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  user: UserReadSchema,
  jwtToken: z.string(),
});

export const ChangePasswordRequestSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string(),
});
export type ChangePasswordRequestType = z.infer<typeof ChangePasswordRequestSchema>;

export const UserUpdateSchema = z.object({
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  about: z.string().nullable().optional(),
});
export type UserUpdateType = z.infer<typeof UserUpdateSchema>;

export const UserRoleUpdateSchema = z.object({
  role: z.string(),
});
export type UserRoleUpdateType = z.infer<typeof UserRoleUpdateSchema>;