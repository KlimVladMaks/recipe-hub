import type { AuthRequest } from "../middlewares/auth.middleware.js";

export class RecipeController {
    static async getRecipe(req: AuthRequest, res: Response) {}

    static async getRecipes(req: AuthRequest, res: Response) {}

    static async addRecipe(req: AuthRequest, res: Response) {}

    static async updateRecipe(req: AuthRequest, res: Response) {}

    static async deleteRecipe(req: AuthRequest, res: Response) {}
}
