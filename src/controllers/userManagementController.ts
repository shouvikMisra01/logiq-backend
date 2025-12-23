// src/controllers/userManagementController.ts
import { Request, Response } from 'express';
import { UserManagementService } from '../services/userManagementService';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { role, search, limit, skip } = req.query;

        // Parse pagination
        const limitVal = limit ? parseInt(limit as string) : 50;
        const skipVal = skip ? parseInt(skip as string) : 0;

        const data = await UserManagementService.getAllUsers(
            role as string,
            search as string,
            limitVal,
            skipVal
        );
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
