import { NextFunction, Request, Response } from "express";
import {
  documentoService,
  FamiliaDocumento,
} from "../services/documento.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

/** Controlador compartido de documentación (proyecto y espacio). */
export class DocumentoController {
  async listar(
    familia: FamiliaDocumento,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("DocumentoController.listar", { familia });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const documentos = await documentoService.listar(
        familia,
        req.params.id,
        req.user.rol,
        req.user.id,
      );
      res.status(200).json({ documentos });
    } catch (error) {
      next(error);
    }
  }

  async subir(
    familia: FamiliaDocumento,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("DocumentoController.subir", { familia });
    try {
      if (!req.file) {
        throw ApiError.validation("No se recibió el PDF (campo 'archivo')");
      }
      const documento = await documentoService.subir(
        familia,
        req.params.id,
        {
          buffer: req.file.buffer,
          nombre: req.file.originalname,
          tamañoBytes: req.file.size,
        },
        {
          titulo: String(req.body.titulo ?? "").trim(),
          descripcion:
            typeof req.body.descripcion === "string"
              ? req.body.descripcion
              : "",
        },
        req.user!.id,
      );
      res.status(201).json({ documento });
    } catch (error) {
      next(error);
    }
  }

  async eliminar(
    familia: FamiliaDocumento,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("DocumentoController.eliminar", { familia });
    try {
      await documentoService.eliminar(
        familia,
        req.params.id,
        req.params.documentoId,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const documentoController = new DocumentoController();
