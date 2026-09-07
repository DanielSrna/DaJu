import { NextFunction, Request, Response } from "express";
import { clienteService } from "../services/cliente.service";
import { logger } from "../config/logger";

export class ClienteController {
  async resumen(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ClienteController.resumen");
    try {
      const resumen =
        req.user!.rol === "admin"
          ? await clienteService.resumenAdmin()
          : await clienteService.resumen(req.user!.id);
      res.status(200).json(resumen);
    } catch (error) {
      next(error);
    }
  }

  async metricas(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const metricas = await clienteService.metricas();
      res.status(200).json(metricas);
    } catch (error) {
      next(error);
    }
  }
}

export const clienteController = new ClienteController();
