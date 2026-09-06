import { NextFunction, Request, Response } from "express";
import { ofertaService } from "../services/oferta.service";
import { logger } from "../config/logger";

export class OfertaController {
  async listarActivas(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("OfertaController.listarActivas");
    try {
      const ofertas = await ofertaService.listarActivas();
      res.status(200).json({ ofertas });
    } catch (error) {
      next(error);
    }
  }

  async listarTodas(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("OfertaController.listarTodas");
    try {
      const ofertas = await ofertaService.listarTodas();
      res.status(200).json({ ofertas });
    } catch (error) {
      next(error);
    }
  }

  async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("OfertaController.crear");
    try {
      const oferta = await ofertaService.crear(req.body);
      res.status(201).json({ oferta });
    } catch (error) {
      next(error);
    }
  }

  async actualizar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("OfertaController.actualizar", { id: req.params.id });
    try {
      const oferta = await ofertaService.actualizar(req.params.id, req.body);
      res.status(200).json({ oferta });
    } catch (error) {
      next(error);
    }
  }

  async eliminar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("OfertaController.eliminar", { id: req.params.id });
    try {
      await ofertaService.eliminar(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const ofertaController = new OfertaController();
