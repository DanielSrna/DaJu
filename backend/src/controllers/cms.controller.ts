import { NextFunction, Request, Response } from "express";
import { cmsService } from "../services/cms.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export class CmsController {
  async obtenerPublico(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("CmsController.obtenerPublico");
    try {
      const cms = await cmsService.obtenerPublico();
      res.status(200).json(cms);
    } catch (error) {
      next(error);
    }
  }

  async actualizarIdentidad(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("CmsController.actualizarIdentidad");
    try {
      let colores: unknown = req.body.colores;
      if (typeof colores === "string") {
        try {
          colores = JSON.parse(colores);
        } catch {
          throw ApiError.validation("El campo 'colores' debe ser JSON válido");
        }
      }
      const params: {
        colores?: Record<string, string>;
        logo?: { buffer: Buffer; nombre: string };
      } = {};
      if (colores !== undefined && typeof colores === "object") {
        params.colores = colores as Record<string, string>;
      }
      if (req.file) {
        params.logo = {
          buffer: req.file.buffer,
          nombre: req.file.originalname,
        };
      }
      const cms = await cmsService.actualizarIdentidad(params);
      res.status(200).json(cms);
    } catch (error) {
      next(error);
    }
  }

  async actualizarMarquesina(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("CmsController.actualizarMarquesina");
    try {
      const resultado = await cmsService.actualizarMarquesina({
        texto: req.body.texto,
        activo: req.body.activo,
      });
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async crearCarruselItem(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("CmsController.crearCarruselItem");
    try {
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ninguna imagen (campo 'imagen')",
        );
      }
      const params: {
        imagen: { buffer: Buffer; nombre: string };
        link?: string;
        titulo?: string;
        activo?: boolean;
        orden?: number;
      } = {
        imagen: { buffer: req.file.buffer, nombre: req.file.originalname },
      };
      if (typeof req.body.link === "string") params.link = req.body.link;
      if (typeof req.body.titulo === "string") params.titulo = req.body.titulo;
      if (req.body.activo !== undefined) {
        params.activo = req.body.activo === true || req.body.activo === "true";
      }
      if (req.body.orden !== undefined) params.orden = Number(req.body.orden);

      const item = await cmsService.crearCarruselItem(params);
      res.status(201).json({ item });
    } catch (error) {
      next(error);
    }
  }

  async eliminarCarruselItem(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("CmsController.eliminarCarruselItem", { id: req.params.id });
    try {
      await cmsService.eliminarCarruselItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const cmsController = new CmsController();
