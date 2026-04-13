import type { AuthRequest } from "../middlewares/auth.middleware.js";

export class CommentController {
    static async getComment(req: AuthRequest, res: Response) {}

    static async getCommentsForRecipe(req: AuthRequest, res: Response) {}

    static async addComment(req: AuthRequest, res: Response) {}

    static async updateComment(req: AuthRequest, res: Response) {}

    static async deleteComment(req: AuthRequest, res: Response) {}

    static async likeComment(req: AuthRequest, res: Response) {}

    static async unlikeComment(req: AuthRequest, res: Response) {} 
}
