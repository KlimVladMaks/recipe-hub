import type { AuthRequest } from "../middlewares/auth.middleware.js";

export class DirectoryController {
    static async getDishType(req: AuthRequest, res: Response) {}

    static async getDishTypes(req: AuthRequest, res: Response) {}

    static async addDishType(req: AuthRequest, res: Response) {}

    static async updateDishType(req: AuthRequest, res: Response) {}

    static async deleteDishType(req: AuthRequest, res: Response) {}
}
