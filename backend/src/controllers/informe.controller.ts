import { NextFunction, Request, Response } from "express";
import {
  informeService,
  FamiliaInforme,
  TipoPrueba,
} from "../services/informe.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

/** Controlador compartido del informe técnico (proyecto y espacio). */
export class InformeController {
  async obtener(
    familia: FamiliaInforme,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("InformeController.obtener", { familia });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const informe = await informeService.obtener(
        familia,
        req.params.id,
        req.user.rol,
        req.user.id,
      );
      res.status(200).json({ informe });
    } catch (error) {
      next(error);
    }
  }

  async descargarPdf(
    familia: FamiliaInforme,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("InformeController.descargarPdf", { familia });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const { buffer, nombreArchivo } = await informeService.generarPdf(
        familia,
        req.params.id,
        req.user.rol,
        req.user.id,
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${nombreArchivo}"`,
      );
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async agregarPrueba(
    familia: FamiliaInforme,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("InformeController.agregarPrueba", { familia });
    try {
      const pruebas = await informeService.agregarPrueba(
        familia,
        req.params.id,
        {
          tipo: req.body.tipo as TipoPrueba,
          titulo: String(req.body.titulo),
          ...(typeof req.body.descripcion === "string"
            ? { descripcion: req.body.descripcion }
            : {}),
          ...(typeof req.body.calificacion === "number"
            ? { calificacion: req.body.calificacion }
            : {}),
          ...(typeof req.body.exitoso === "boolean"
            ? { exitoso: req.body.exitoso }
            : {}),
        },
        req.user!.id,
      );
      res.status(201).json({ pruebas });
    } catch (error) {
      next(error);
    }
  }

  async actualizarPrueba(
    familia: FamiliaInforme,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("InformeController.actualizarPrueba", { familia });
    try {
      const pruebas = await informeService.actualizarPrueba(
        familia,
        req.params.id,
        req.params.pruebaId,
        {
          ...(typeof req.body.titulo === "string"
            ? { titulo: req.body.titulo }
            : {}),
          ...(typeof req.body.descripcion === "string"
            ? { descripcion: req.body.descripcion }
            : {}),
          ...(typeof req.body.calificacion === "number" ||
          req.body.calificacion === null
            ? { calificacion: req.body.calificacion }
            : {}),
          ...(typeof req.body.exitoso === "boolean"
            ? { exitoso: req.body.exitoso }
            : {}),
        },
      );
      res.status(200).json({ pruebas });
    } catch (error) {
      next(error);
    }
  }

  async eliminarPrueba(
    familia: FamiliaInforme,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("InformeController.eliminarPrueba", { familia });
    try {
      const pruebas = await informeService.eliminarPrueba(
        familia,
        req.params.id,
        req.params.pruebaId,
      );
      res.status(200).json({ pruebas });
    } catch (error) {
      next(error);
    }
  }

  async actualizarImpacto(
    familia: FamiliaInforme,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("InformeController.actualizarImpacto", { familia });
    try {
      const impacto = await informeService.actualizarImpacto(
        familia,
        req.params.id,
        {
          porcentaje:
            req.body.porcentaje === null || req.body.porcentaje === undefined
              ? null
              : Number(req.body.porcentaje),
          ...(typeof req.body.descripcion === "string"
            ? { descripcion: req.body.descripcion }
            : {}),
        },
      );
      res.status(200).json({ impacto });
    } catch (error) {
      next(error);
    }
  }
}

export const informeController = new InformeController();
