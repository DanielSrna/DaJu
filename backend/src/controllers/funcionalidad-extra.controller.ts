import { NextFunction, Request, Response } from "express";
import { funcionalidadExtraService } from "../services/funcionalidad-extra.service";
import { logger } from "../config/logger";

export class FuncionalidadExtraController {
  async listarActivas(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("FuncionalidadExtraController.listarActivas");
    try {
      const funcionalidades = await funcionalidadExtraService.listarActivas();
      res.status(200).json({ funcionalidades });
    } catch (error) {
      next(error);
    }
  }

  async listarTodas(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("FuncionalidadExtraController.listarTodas");
    try {
      const funcionalidades = await funcionalidadExtraService.listarTodas();
      res.status(200).json({ funcionalidades });
    } catch (error) {
      next(error);
    }
  }

  async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("FuncionalidadExtraController.crear");
    try {
      const funcionalidad = await funcionalidadExtraService.crear(req.body);
      res.status(201).json({ funcionalidad });
    } catch (error) {
      next(error);
    }
  }

  async actualizar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("FuncionalidadExtraController.actualizar", {
      id: req.params.id,
    });
    try {
      const funcionalidad = await funcionalidadExtraService.actualizar(
        req.params.id,
        req.body,
      );
      res.status(200).json({ funcionalidad });
    } catch (error) {
      next(error);
    }
  }

  async eliminar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("FuncionalidadExtraController.eliminar", {
      id: req.params.id,
    });
    try {
      await funcionalidadExtraService.eliminar(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const funcionalidadExtraController = new FuncionalidadExtraController();
