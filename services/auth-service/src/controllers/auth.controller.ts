import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { AuthService } from '../services/auth.service.js';
import {
  UserReadSchema,
  UserReadListSchema,
  LoginResponseSchema,
  type RegisterRequestType,
  type LoginRequestType,
  type ChangePasswordRequestType,
  type UserUpdateType,
  type UserRoleUpdateType,
} from '../schemas/index.js';

export class AuthController {
  static async register(req: AuthRequest, res: Response) {
    try {
      const data: RegisterRequestType = req.body;
      const user = await AuthService.register(data);
      res.status(201).json(UserReadSchema.parse(user));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async login(req: AuthRequest, res: Response) {
    try {
      const data: LoginRequestType = req.body;
      const result = await AuthService.login(data);
      res.status(200).json(LoginResponseSchema.parse(result));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const data: ChangePasswordRequestType = req.body;
      await AuthService.changePassword(req.currentUserId!, data);
      res.status(200).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getUsers(req: AuthRequest, res: Response) {
    try {
      if (!(await AuthService.isUserAdmin(req.currentUserId!))) {
        res.status(403).json({ message: 'Доступ только для администраторов' });
        return;
      }
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '20');
      const users = await AuthService.getUsers(page, limit);
      res.status(200).json(UserReadListSchema.parse(users));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      const user = await AuthService.getUser(req.currentUserId!);
      res.status(200).json(UserReadSchema.parse(user));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateCurrentUser(req: AuthRequest, res: Response) {
    try {
      const data: UserUpdateType = req.body;
      const user = await AuthService.updateUser(req.currentUserId!, data);
      res.status(200).json(UserReadSchema.parse(user));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteCurrentUser(req: AuthRequest, res: Response) {
    try {
      await AuthService.deleteUser(req.currentUserId!);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getUser(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      const user = await AuthService.getUser(userId);
      res.status(200).json(UserReadSchema.parse(user));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteUser(req: AuthRequest, res: Response) {
    try {
      if (!(await AuthService.isUserAdmin(req.currentUserId!))) {
        res.status(403).json({ message: 'Доступ только для администраторов' });
        return;
      }
      const userId = parseInt(req.params.userId);
      await AuthService.deleteUser(userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateUserRole(req: AuthRequest, res: Response) {
    try {
      if (!(await AuthService.isUserAdmin(req.currentUserId!))) {
        res.status(403).json({ message: 'Доступ только для администраторов' });
        return;
      }
      const userId = parseInt(req.params.userId);
      const data: UserRoleUpdateType = req.body;
      const user = await AuthService.updateUserRole(userId, data);
      res.status(200).json(UserReadSchema.parse(user));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}