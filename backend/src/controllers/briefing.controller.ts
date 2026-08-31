import { NextFunction, Request, Response } from "express";
import { briefingService } from "../services/briefing.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export class BriefingController {
  async obtener(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("BriefingController.obtener", {
      proyectoId: req.params.proyectoId,
    });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const briefing = await briefingService.obtener(
        req.params.proyectoId,
        req.user.rol,
        req.user.id,
      );
      res.status(200).json({ briefing });
    } catch (error) {
      next(error);
    }
  }

  async guardarContenido(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("BriefingController.guardarContenido", {
      proyectoId: req.params.proyectoId,
    });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const contenido = req.body.contenido ?? {};
      const briefing = await briefingService.guardarContenido(
        req.params.proyectoId,
        req.user.rol,
        req.user.id,
        contenido,
        typeof req.body.completado === "boolean"
          ? req.body.completado
          : undefined,
      );
      res.status(200).json({ briefing });
    } catch (error) {
      next(error);
    }
  }

  async subirArchivo(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("BriefingController.subirArchivo", {
      proyectoId: req.params.proyectoId,
    });
    try {
      if (!req.user) throw ApiError.unauthorized();
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ningún archivo (campo 'archivo')",
        );
      }

      const briefing = await briefingService.agregarArchivo(
        req.params.proyectoId,
        req.user.rol,
        req.user.id,
        {
          buffer: req.file.buffer,
          nombre: req.file.originalname,
          tamañoBytes: req.file.size,
          tipo: req.body.tipo ?? "otro",
        },
      );
      res.status(201).json({ briefing });
    } catch (error) {
      next(error);
    }
  }

  async eliminarArchivo(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("BriefingController.eliminarArchivo", {
      proyectoId: req.params.proyectoId,
    });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const briefing = await briefingService.eliminarArchivo(
        req.params.proyectoId,
        req.user.rol,
        req.user.id,
        req.params.archivoId,
      );
      res.status(200).json({ briefing });
    } catch (error) {
      next(error);
    }
  }
}

export const briefingController = new BriefingController();
