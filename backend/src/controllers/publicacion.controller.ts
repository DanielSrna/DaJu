import { NextFunction, Request, Response } from "express";
import { publicacionService } from "../services/publicacion.service";
import { logger } from "../config/logger";

export class PublicacionController {
  async listarPublicas(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PublicacionController.listarPublicas");
    try {
      const filtros: {
        tipo?: string;
        seccion?: string;
        pagina: number;
        limite: number;
      } = {
        pagina: Number(req.query.pagina ?? 1),
        limite: Number(req.query.limite ?? 20),
      };
      if (typeof req.query.tipo === "string") filtros.tipo = req.query.tipo;
      if (typeof req.query.seccion === "string")
        filtros.seccion = req.query.seccion;

      const resultado = await publicacionService.listarPublicas(filtros);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obtenerPorSlug(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PublicacionController.obtenerPorSlug", {
      slug: req.params.slug,
    });
    try {
      const publicacion = await publicacionService.obtenerPorSlug(
        req.params.slug,
      );
      res.status(200).json({ publicacion });
    } catch (error) {
      next(error);
    }
  }

  async listarTodas(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PublicacionController.listarTodas");
    try {
      const publicaciones = await publicacionService.listarTodas();
      res.status(200).json({ publicaciones });
    } catch (error) {
      next(error);
    }
  }

  async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("PublicacionController.crear");
    try {
      const publicacion = await publicacionService.crear(req.body);
      res.status(201).json({ publicacion });
    } catch (error) {
      next(error);
    }
  }

  async actualizar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PublicacionController.actualizar", { id: req.params.id });
    try {
      const publicacion = await publicacionService.actualizar(
        req.params.id,
        req.body,
      );
      res.status(200).json({ publicacion });
    } catch (error) {
      next(error);
    }
  }

  async eliminar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PublicacionController.eliminar", { id: req.params.id });
    try {
      await publicacionService.eliminar(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const publicacionController = new PublicacionController();
