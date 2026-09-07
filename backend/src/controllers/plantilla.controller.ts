import { NextFunction, Request, Response } from "express";
import { plantillaService } from "../services/plantilla.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export class PlantillaController {
  async listarActivas(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PlantillaController.listarActivas");
    try {
      const plantillas = await plantillaService.listarActivos();
      res.status(200).json({ plantillas });
    } catch (error) {
      next(error);
    }
  }

  async obtenerPorSlug(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PlantillaController.obtenerPorSlug", {
      slug: req.params.slug,
    });
    try {
      const plantilla = await plantillaService.obtenerPorSlug(req.params.slug);
      res.status(200).json({ plantilla });
    } catch (error) {
      next(error);
    }
  }

  async listarTodas(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PlantillaController.listarTodas");
    try {
      const plantillas = await plantillaService.listarTodas();
      res.status(200).json({ plantillas });
    } catch (error) {
      next(error);
    }
  }

  async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("PlantillaController.crear");
    try {
      const plantilla = await plantillaService.crear(req.body);
      res.status(201).json({ plantilla });
    } catch (error) {
      next(error);
    }
  }

  async actualizar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PlantillaController.actualizar", { id: req.params.id });
    try {
      const plantilla = await plantillaService.actualizar(
        req.params.id,
        req.body,
      );
      res.status(200).json({ plantilla });
    } catch (error) {
      next(error);
    }
  }

  async eliminar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PlantillaController.eliminar", { id: req.params.id });
    try {
      await plantillaService.eliminar(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async subirImagenPrincipal(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PlantillaController.subirImagenPrincipal", {
      id: req.params.id,
    });
    try {
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ninguna imagen (campo 'imagen')",
        );
      }
      const plantilla = await plantillaService.subirImagenPrincipal(
        req.params.id,
        {
          buffer: req.file.buffer,
          nombre: req.file.originalname,
        },
      );
      res.status(200).json({ plantilla });
    } catch (error) {
      next(error);
    }
  }

  async agregarImagenGaleria(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PlantillaController.agregarImagenGaleria", {
      id: req.params.id,
    });
    try {
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ninguna imagen (campo 'imagen')",
        );
      }
      const plantilla = await plantillaService.agregarImagenGaleria(
        req.params.id,
        {
          buffer: req.file.buffer,
          nombre: req.file.originalname,
        },
      );
      res.status(201).json({ plantilla });
    } catch (error) {
      next(error);
    }
  }

  async eliminarImagenGaleria(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PlantillaController.eliminarImagenGaleria", {
      id: req.params.id,
      imagenPublicId: req.params.imagenPublicId,
    });
    try {
      const plantilla = await plantillaService.eliminarImagenGaleria(
        req.params.id,
        req.params.imagenPublicId,
      );
      res.status(200).json({ plantilla });
    } catch (error) {
      next(error);
    }
  }
}

export const plantillaController = new PlantillaController();
