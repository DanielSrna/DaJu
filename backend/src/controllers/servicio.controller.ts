import { NextFunction, Request, Response } from "express";
import { servicioService } from "../services/servicio.service";
import { logger } from "../config/logger";

export class ServicioController {
  async listarActivos(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ServicioController.listarActivos");
    try {
      const servicios = await servicioService.listarActivos();
      res.status(200).json({ servicios });
    } catch (error) {
      next(error);
    }
  }

  async obtenerPorSlug(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ServicioController.obtenerPorSlug", {
      slug: req.params.slug,
    });
    try {
      const servicio = await servicioService.obtenerPorSlug(req.params.slug);
      res.status(200).json({ servicio });
    } catch (error) {
      next(error);
    }
  }

  async listarTodos(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ServicioController.listarTodos");
    try {
      const servicios = await servicioService.listarTodos();
      res.status(200).json({ servicios });
    } catch (error) {
      next(error);
    }
  }

  async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("ServicioController.crear");
    try {
      const servicio = await servicioService.crear(req.body);
      res.status(201).json({ servicio });
    } catch (error) {
      next(error);
    }
  }

  async actualizar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ServicioController.actualizar", { id: req.params.id });
    try {
      const servicio = await servicioService.actualizar(
        req.params.id,
        req.body,
      );
      res.status(200).json({ servicio });
    } catch (error) {
      next(error);
    }
  }

  async eliminar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ServicioController.eliminar", { id: req.params.id });
    try {
      await servicioService.eliminar(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const servicioController = new ServicioController();
