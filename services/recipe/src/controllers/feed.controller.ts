import type { Response } from 'express'
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { FeedService } from '../services/feed.service.js';
import { RecipeReadListSchema } from '../schemas/recipe.schemas.js';
import type { Difficulty } from '@prisma/client';


export class FeedController {
    static async getFeed(req: AuthRequest, res: Response) {
        try {
            const currentUserId = req.currentUserId!;
            const { 
                page:pageStr='1', 
                limit:limitStr='20',
                search="",
                dishTypeIds:dishTypeIdsStr="",
                ingredientIds:ingredientIdsStr="",
                difficulty="",
            } = req.query;

            const page = parseInt(pageStr as string);
            const limit = parseInt(limitStr as string);

            let dishTypeIds: Array<number>;
            if (dishTypeIdsStr === "") {
                dishTypeIds = [];
            } else {
                dishTypeIds = (dishTypeIdsStr as string)
                    .split(',')
                    .map(id => parseInt(id.trim()));
            }

            let ingredientIds: Array<number>;
            if (ingredientIdsStr === "") {
                ingredientIds = [];
            } else {
                ingredientIds = (ingredientIdsStr as string)
                    .split(',')
                    .map(id => parseInt(id.trim()));
            }

            const feed = await FeedService.getFeed(
                currentUserId,
                page,
                limit,
                search as string,
                dishTypeIds,
                ingredientIds,
                difficulty as Difficulty
            );
            res.status(200).json(RecipeReadListSchema.parse(feed));
        } catch (error: any) {
            res.status(400).json({
                message: error.message,
            });
        };
    };
}