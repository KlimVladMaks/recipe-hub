import type { MediaType } from '../generated/prisma/client';
import { prisma } from '../config/database.js';
import { NotFoundError } from '../errors.js';
import type { StepCreateType, StepUpdateType } from '../schemas/step.schemas.js';

const withSortedMedia = <T extends { media: { sortOrder: number }[] }>(step: T) => ({
    ...step,
    media: [...step.media].sort((a, b) => a.sortOrder - b.sortOrder),
});

export class StepService {
    static async getSteps(recipeId: number) {
        const steps = await prisma.recipeStep.findMany({
            where: { recipeId },
            orderBy: { number: 'asc' },
            include: {
                media: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });
        return steps.map(withSortedMedia);
    };

    static async addStep(recipeId: number, stepCreateData: StepCreateType) {
        const { number, title, description, media } = stepCreateData;

        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { id: true },
        });
        if (!recipe) {
            throw new NotFoundError('Рецепт не найден');
        }

        const newStep = await prisma.$transaction(async (tx) => {
            const step = await tx.recipeStep.create({
                data: {
                    recipeId,
                    number,
                    title,
                    description: description ?? null,
                },
            });

            if (media && media.length > 0) {
                await tx.recipeStepMedia.createMany({
                    data: media.map((m, idx) => ({
                        recipeStepId: step.id,
                        sortOrder: m.sortOrder ?? idx,
                        mediaType: m.mediaType as MediaType,
                        mediaUrl: m.mediaUrl,
                    })),
                });
            }

            return tx.recipeStep.findUnique({
                where: { id: step.id },
                include: {
                    media: {
                        orderBy: { sortOrder: 'asc' },
                    },
                },
            });
        });

        if (!newStep) {
            throw new NotFoundError('Не удалось создать шаг');
        }

        return withSortedMedia(newStep);
    };

    static async getStep(stepId: number) {
        const step = await prisma.recipeStep.findUnique({
            where: { id: stepId },
            include: {
                media: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });

        if (!step) {
            throw new NotFoundError('Шаг не найден');
        }

        return withSortedMedia(step);
    };

    static async updateStep(stepId: number, stepUpdateData: StepUpdateType) {
        const { number, title, description, media } = stepUpdateData;

        const existing = await prisma.recipeStep.findUnique({
            where: { id: stepId },
            select: { id: true },
        });
        if (!existing) {
            throw new NotFoundError('Шаг не найден');
        }

        const updatedStep = await prisma.$transaction(async (tx) => {
            const updateData: {
                number?: number;
                title?: string;
                description?: string | null;
            } = {};

            if (number !== undefined) updateData.number = number;
            if (title !== undefined) updateData.title = title;
            if (description !== undefined) updateData.description = description;

            await tx.recipeStep.update({
                where: { id: stepId },
                data: updateData,
            });

            if (media !== undefined) {
                await tx.recipeStepMedia.deleteMany({
                    where: { recipeStepId: stepId },
                });

                if (media.length > 0) {
                    await tx.recipeStepMedia.createMany({
                        data: media.map((m, idx) => ({
                            recipeStepId: stepId,
                            sortOrder: m.sortOrder ?? idx,
                            mediaType: (m.mediaType ?? 'photo') as MediaType,
                            mediaUrl: m.mediaUrl ?? '',
                        })),
                    });
                }
            }

            return tx.recipeStep.findUnique({
                where: { id: stepId },
                include: {
                    media: { orderBy: { sortOrder: 'asc' } },
                },
            });
        });

        if (!updatedStep) {
            throw new NotFoundError('Шаг не найден');
        }

        return withSortedMedia(updatedStep);
    }

    static async deleteStep(stepId: number) {
        const existing = await prisma.recipeStep.findUnique({
            where: { id: stepId },
            select: { id: true },
        });
        if (!existing) {
            throw new NotFoundError('Шаг не найден');
        }
        await prisma.recipeStep.delete({
            where: { id: stepId },
        });
    };

    static async isCorrectStepId(stepId: number, recipeId: number) {
        const count = await prisma.recipeStep.count({
            where: {
                id: stepId,
                recipeId,
            },
        });
        return count > 0;
    };
}
