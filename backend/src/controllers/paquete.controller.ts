import { NextFunction, Request, Response } from "express";
import { paqueteService } from "../services/paquete.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export class PaqueteController {
  async listarActivos(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PaqueteController.listarActivos");
    try {
      const paquetes = await paqueteService.listarActivos();
      res.status(200).json({ paquetes });
    } catch (error) {
      next(error);
    }
  }

  async obtenerPorSlug(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PaqueteController.obtenerPorSlug", {
      slug: req.params.slug,
    });
    try {
      const paquete = await paqueteService.obtenerPorSlug(req.params.slug);
      res.status(200).json({ paquete });
    } catch (error) {
      next(error);
    }
  }

  async listarTodos(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PaqueteController.listarTodos");
    try {
      const paquetes = await paqueteService.listarTodos();
      res.status(200).json({ paquetes });
    } catch (error) {
      next(error);
    }
  }

  async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("PaqueteController.crear");
    try {
      const paquete = await paqueteService.crear(req.body);
      res.status(201).json({ paquete });
    } catch (error) {
      next(error);
    }
  }

  async actualizar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PaqueteController.actualizar", { id: req.params.id });
    try {
      const paquete = await paqueteService.actualizar(req.params.id, req.body);
      res.status(200).json({ paquete });
    } catch (error) {
      next(error);
    }
  }

  async eliminar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PaqueteController.eliminar", { id: req.params.id });
    try {
      await paqueteService.eliminar(req.params.id);
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
    logger.proceso("PaqueteController.subirImagenPrincipal", {
      id: req.params.id,
    });
    try {
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ninguna imagen (campo 'imagen')",
        );
      }
      const paquete = await paqueteService.subirImagenPrincipal(req.params.id, {
        buffer: req.file.buffer,
        nombre: req.file.originalname,
      });
      res.status(200).json({ paquete });
    } catch (error) {
      next(error);
    }
  }

  async agregarImagenGaleria(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PaqueteController.agregarImagenGaleria", {
      id: req.params.id,
    });
    try {
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ninguna imagen (campo 'imagen')",
        );
      }
      const paquete = await paqueteService.agregarImagenGaleria(req.params.id, {
        buffer: req.file.buffer,
        nombre: req.file.originalname,
      });
      res.status(201).json({ paquete });
    } catch (error) {
      next(error);
    }
  }

  async eliminarImagenGaleria(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PaqueteController.eliminarImagenGaleria", {
      id: req.params.id,
      imagenPublicId: req.params.imagenPublicId,
    });
    try {
      const paquete = await paqueteService.eliminarImagenGaleria(
        req.params.id,
        req.params.imagenPublicId,
      );
      res.status(200).json({ paquete });
    } catch (error) {
      next(error);
    }
  }
}

export const paqueteController = new PaqueteController();
