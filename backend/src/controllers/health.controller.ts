import { Request, Response, NextFunction } from "express";
import { healthService, HealthStatus } from "../services/health.service";
import { logger } from "../config/logger";

export class HealthController {
  async getStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("HealthController.getStatus");
    try {
      const status: HealthStatus = await healthService.getStatus();
      logger.exito("HealthController.getStatus completado", {
        requestId: req.requestId,
      });
      res.status(200).json(status);
    } catch (error) {
      logger.fracaso("HealthController.getStatus falló", {
        error: (error as Error).message,
      });
      next(error);
    }
  }
}

export const healthController = new HealthController();
