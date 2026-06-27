import { z } from 'zod'


export const StepMediaReadSchema = z.object({
    sortOrder: z.number(),
    mediaType: z.string(),
    mediaUrl: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type StepMediaReadType = z.infer<typeof StepMediaReadSchema>;


export const StepMediaReadListSchema = z.array(StepMediaReadSchema);
export type StepMediaReadListType = z.infer<typeof StepMediaReadListSchema>;


export const StepMediaCreateSchema = z.object({
    sortOrder: z.number(),
    mediaType: z.string(),
    mediaUrl: z.string(),
});
export type StepMediaCreateType = z.infer<typeof StepMediaCreateSchema>;


export const StepMediaCreateListSchema = z.array(StepMediaCreateSchema);
export type StepMediaCreateListType = z.infer<typeof StepMediaCreateListSchema>;


export const StepMediaUpdateSchema = z.object({
    sortOrder: z.number().optional(),
    mediaType: z.string().optional(),
    mediaUrl: z.string().optional(),
});
export type StepMediaUpdateType = z.infer<typeof StepMediaUpdateSchema>;


export const StepMediaUpdateListSchema = z.array(StepMediaUpdateSchema);
export type StepMediaUpdateListType = z.infer<typeof StepMediaUpdateListSchema>;


export const StepReadSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    media: z.array(z.object({
        sortOrder: z.number(),
        mediaType: z.string(),
        mediaUrl: z.string(),
        createdAt: z.date(),
        updatedAt: z.date(),
    })),
    description: z.string().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type StepReadType = z.infer<typeof StepReadSchema>;


export const StepReadListSchema = z.array(StepReadSchema);
export type StepReadListType = z.infer<typeof StepReadListSchema>;


export const StepCreateSchema = z.object({
    number: z.number(),
    title: z.string(),
    media: z.array(z.object({
        sortOrder: z.number(),
        mediaType: z.string(),
        mediaUrl: z.string(),
    })).optional(),
    description: z.string().optional(),
});
export type StepCreateType = z.infer<typeof StepCreateSchema>;


export const StepUpdateSchema = z.object({
    number: z.number().optional(),
    title: z.string().optional(),
    media: z.array(z.object({
        sortOrder: z.number().optional(),
        mediaType: z.string().optional(),
        mediaUrl: z.string().optional(),
    })).optional(),
    description: z.string().nullable().optional(),
});
export type StepUpdateType = z.infer<typeof StepUpdateSchema>;
