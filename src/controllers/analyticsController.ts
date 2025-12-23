// src/controllers/analyticsController.ts
import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';

export const getSystemAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = await AnalyticsService.getSystemAnalytics();
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
