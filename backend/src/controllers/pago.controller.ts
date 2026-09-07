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
      const {
        tipoProducto,
        paqueteId,
        productoId,
        cantidad,
        email,
        nombre,
        password,
        funcionalidades,
        negociarDespues,
      } = req.body;
      const params: {
        tipoProducto?: "paquete" | "plantilla" | "servicio";
        paqueteId?: string;
        productoId?: string;
        cantidad?: number;
        email: string;
        nombre?: string;
        password?: string;
        funcionalidades?: string[];
        negociarDespues?: boolean;
      } = { email };
      if (
        typeof tipoProducto === "string" &&
        ["paquete", "plantilla", "servicio"].includes(tipoProducto)
      ) {
        params.tipoProducto = tipoProducto as NonNullable<
          typeof params.tipoProducto
        >;
      }
      if (typeof paqueteId === "string") params.paqueteId = paqueteId;
      if (typeof productoId === "string") params.productoId = productoId;
      if (typeof cantidad === "number") params.cantidad = cantidad;
      if (typeof nombre === "string") params.nombre = nombre;
      if (typeof password === "string") params.password = password;
      if (Array.isArray(funcionalidades))
        params.funcionalidades = funcionalidades;
      if (typeof negociarDespues === "boolean")
        params.negociarDespues = negociarDespues;

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

  /** Webhook de MercadoPago: JSON + firmas en headers (IPN v1). */
  async procesarWebhookMercadoPago(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.procesarWebhookMercadoPago", {
      requestId: req.requestId,
    });
    try {
      const entry = {
        ...(req.body as Record<string, unknown>),
        ...(req.query as Record<string, unknown>),
        headers: {
          "x-request-id": req.header("x-request-id") ?? "",
          "x-manifest": req.header("x-manifest") ?? "",
          "x-signature": req.header("x-signature") ?? "",
        },
      };
      const resultado = await pagoService.procesarWebhook(entry);
      logger.exito("PagoController.procesarWebhookMercadoPago completado", {
        estado: resultado.estado,
      });
      res.status(200).json({ ok: true, estado: resultado.estado });
    } catch (error) {
      next(error);
    }
  }

  async refundar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const pago = await pagoService.refundar(req.params.id, req.user!.id);
      res.status(200).json({ pago });
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
