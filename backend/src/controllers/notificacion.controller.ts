import { NextFunction, Request, Response } from "express";
import { notificacionService } from "../services/notificacion.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export class NotificacionController {
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("NotificacionController.listar");
    try {
      const notificaciones = await notificacionService.listarMias(
        req.user!.id,
        req.user!.rol,
      );
      res.status(200).json({ notificaciones });
    } catch (error) {
      next(error);
    }
  }

  async sinLeer(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const total = await notificacionService.sinLeer(
        req.user!.id,
        req.user!.rol,
      );
      res.status(200).json({ total });
    } catch (error) {
      next(error);
    }
  }

  async marcarLeida(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.params.id) throw ApiError.validation("Falta el id");
      await notificacionService.marcarLeida(
        req.params.id,
        req.user!.id,
        req.user!.rol,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const notificacionController = new NotificacionController();
