import { NextFunction, Request, Response } from "express";
import { metodoPagoService } from "../services/metodo-pago.service";
import { logger } from "../config/logger";

export class MetodoPagoController {
  async listarActivos(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("MetodoPagoController.listarActivos");
    try {
      const metodos = await metodoPagoService.listarActivos();
      res.status(200).json({ metodos });
    } catch (error) {
      next(error);
    }
  }

  async listarTodos(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("MetodoPagoController.listarTodos");
    try {
      const metodos = await metodoPagoService.listarTodos();
      res.status(200).json({ metodos });
    } catch (error) {
      next(error);
    }
  }

  async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("MetodoPagoController.crear");
    try {
      const metodo = await metodoPagoService.crear(req.body);
      res.status(201).json({ metodo });
    } catch (error) {
      next(error);
    }
  }

  async actualizar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("MetodoPagoController.actualizar", { id: req.params.id });
    try {
      const metodo = await metodoPagoService.actualizar(
        req.params.id,
        req.body,
      );
      res.status(200).json({ metodo });
    } catch (error) {
      next(error);
    }
  }

  async eliminar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("MetodoPagoController.eliminar", { id: req.params.id });
    try {
      await metodoPagoService.eliminar(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const metodoPagoController = new MetodoPagoController();
