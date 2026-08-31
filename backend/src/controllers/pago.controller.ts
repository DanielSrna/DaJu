import { NextFunction, Request, Response } from "express";
import { pagoService } from "../services/pago.service";
import { logger } from "../config/logger";

export class PagoController {
  async crearCheckout(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.crearCheckout");
    try {
      const { paqueteId, email } = req.body;
      const params: { paqueteId: string; email: string; clienteId?: string } = {
        paqueteId,
        email,
      };
      if (req.user) {
        params.clienteId = req.user.id;
      }
      const resultado = await pagoService.crearCheckout(params);
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async procesarWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.procesarWebhook", {
      requestId: req.requestId,
    });
    try {
      const resultado = await pagoService.procesarWebhook(req.body);
      logger.exito("PagoController.procesarWebhook completado", {
        estado: resultado.estado,
      });
      // ePayco espera "ok" en el body para no reintentar el envío.
      res.status(200).send("ok");
    } catch (error) {
      next(error);
    }
  }

  async listarMisPagos(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.listarMisPagos");
    try {
      if (!req.user) {
        res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "No autenticado" },
        });
        return;
      }
      const pagos = await pagoService.listarMisPagos(req.user.id);
      res.status(200).json({ pagos });
    } catch (error) {
      next(error);
    }
  }

  async listarTodos(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.listarTodos");
    try {
      const pagos = await pagoService.listarTodos();
      res.status(200).json({ pagos });
    } catch (error) {
      next(error);
    }
  }
}

export const pagoController = new PagoController();
