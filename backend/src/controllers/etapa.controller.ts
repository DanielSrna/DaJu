import { NextFunction, Request, Response } from "express";
import { etapaService, FamiliaEntorno } from "../services/etapa.service";
import { logger } from "../config/logger";

/** Controlador compartido de etapas (proyecto y espacio). */
export class EtapaController {
  async agregar(
    familia: FamiliaEntorno,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("EtapaController.agregar", { familia, id: req.params.id });
    try {
      const etapas = await etapaService.agregar(
        familia,
        req.params.id,
        {
          nombre: String(req.body.nombre),
          ...(typeof req.body.descripcion === "string"
            ? { descripcion: req.body.descripcion }
            : {}),
          ...(typeof req.body.monto === "number"
            ? { monto: req.body.monto }
            : {}),
          ...(typeof req.body.requierePago === "boolean"
            ? { requierePago: req.body.requierePago }
            : {}),
        },
        req.user!.id,
      );
      res.status(201).json({ etapas });
    } catch (error) {
      next(error);
    }
  }

  async actualizar(
    familia: FamiliaEntorno,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("EtapaController.actualizar", { familia });
    try {
      const etapas = await etapaService.actualizar(
        familia,
        req.params.id,
        req.params.etapaId,
        {
          ...(typeof req.body.nombre === "string"
            ? { nombre: req.body.nombre }
            : {}),
          ...(typeof req.body.descripcion === "string"
            ? { descripcion: req.body.descripcion }
            : {}),
          ...(typeof req.body.monto === "number"
            ? { monto: req.body.monto }
            : {}),
          ...(typeof req.body.requierePago === "boolean"
            ? { requierePago: req.body.requierePago }
            : {}),
        },
        req.user!.id,
      );
      res.status(200).json({ etapas });
    } catch (error) {
      next(error);
    }
  }

  async eliminar(
    familia: FamiliaEntorno,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("EtapaController.eliminar", { familia });
    try {
      const etapas = await etapaService.eliminar(
        familia,
        req.params.id,
        req.params.etapaId,
        req.user!.id,
      );
      res.status(200).json({ etapas });
    } catch (error) {
      next(error);
    }
  }

  async reordenar(
    familia: FamiliaEntorno,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("EtapaController.reordenar", { familia });
    try {
      const etapas = await etapaService.reordenar(
        familia,
        req.params.id,
        req.body.orden as string[],
        req.user!.id,
      );
      res.status(200).json({ etapas });
    } catch (error) {
      next(error);
    }
  }

  async cambiarEstado(
    familia: FamiliaEntorno,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("EtapaController.cambiarEstado", { familia });
    try {
      const etapas = await etapaService.cambiarEstado(
        familia,
        req.params.id,
        req.params.etapaId,
        req.body.estado === "completada" ? "completada" : "en_curso",
        req.user!.id,
      );
      res.status(200).json({ etapas });
    } catch (error) {
      next(error);
    }
  }

  async solicitarPago(
    familia: FamiliaEntorno,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("EtapaController.solicitarPago", { familia });
    try {
      const pago = await etapaService.solicitarPago(
        familia,
        req.params.id,
        req.params.etapaId,
        req.user!.id,
      );
      res.status(201).json({ pago });
    } catch (error) {
      next(error);
    }
  }
}

export const etapaController = new EtapaController();
