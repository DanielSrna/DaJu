import { NextFunction, Request, Response } from "express";
import { pagoService } from "../services/pago.service";
import { ApiError } from "../utils/ApiError";
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

  /** Admin: habilita un pago (etapa del plan o sesiones de consultoría). */
  async solicitarPago(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.solicitarPago");
    try {
      const {
        proyectoId,
        espacioId,
        etapaId,
        tipoPago,
        monto,
        cantidad,
        descripcion,
      } = req.body;
      const pago = await pagoService.solicitarPago(
        {
          ...(typeof proyectoId === "string" ? { proyectoId } : {}),
          ...(typeof espacioId === "string" ? { espacioId } : {}),
          ...(typeof etapaId === "string" ? { etapaId } : {}),
          tipoPago: tipoPago === "sesiones" ? "sesiones" : "etapa",
          monto: Number(monto),
          ...(typeof cantidad === "number" ? { cantidad } : {}),
          ...(typeof descripcion === "string" ? { descripcion } : {}),
        },
        req.user!.id,
      );
      res.status(201).json({ pago });
    } catch (error) {
      next(error);
    }
  }

  /** Cliente: elige método de pago (PayPal devuelve URL). */
  async elegirMetodo(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.elegirMetodo", { pagoId: req.params.id });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const resultado = await pagoService.elegirMetodo(
        req.params.id,
        req.user.id,
        String(req.body.metodo ?? ""),
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  /** Cliente: sube el comprobante de una transferencia. */
  async subirComprobante(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.subirComprobante", {
      pagoId: req.params.id,
    });
    try {
      if (!req.user) throw ApiError.unauthorized();
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió el comprobante (campo 'archivo')",
        );
      }
      const pago = await pagoService.subirComprobante(
        req.params.id,
        req.user.id,
        {
          buffer: req.file.buffer,
          nombre: req.file.originalname,
          tamañoBytes: req.file.size,
        },
        typeof req.body.referenciaCliente === "string"
          ? req.body.referenciaCliente
          : undefined,
      );
      res.status(200).json({ pago });
    } catch (error) {
      next(error);
    }
  }

  /** Admin: confirma un pago revisado. */
  async confirmarPago(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.confirmarPago", { pagoId: req.params.id });
    try {
      const pago = await pagoService.confirmarPago(req.params.id, req.user!.id);
      res.status(200).json({ pago });
    } catch (error) {
      next(error);
    }
  }

  /** Admin: rechaza el comprobante con un motivo. */
  async rechazarPago(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.rechazarPago", { pagoId: req.params.id });
    try {
      const pago = await pagoService.rechazarPago(
        req.params.id,
        req.user!.id,
        String(req.body.motivo ?? ""),
      );
      res.status(200).json({ pago });
    } catch (error) {
      next(error);
    }
  }

  /** Cliente: captura la orden de PayPal al volver del checkout. */
  async capturarPaypal(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.capturarPaypal", {
      pagoId: req.params.id,
    });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const pago = await pagoService.capturarPaypal(req.params.id, req.user.id);
      res.status(200).json({ pago });
    } catch (error) {
      next(error);
    }
  }

  /** Admin: pagos con comprobante por verificar. */
  async listarPorVerificar(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.listarPorVerificar");
    try {
      const pagos = await pagoService.listarPorVerificar();
      res.status(200).json({ pagos });
    } catch (error) {
      next(error);
    }
  }

  /** Detalle de un pago (cliente propietario o admin). */
  async obtenerPago(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.obtenerPago", { pagoId: req.params.id });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const pago = await pagoService.obtenerPago(
        req.params.id,
        req.user.id,
        req.user.rol,
      );
      res.status(200).json({ pago });
    } catch (error) {
      next(error);
    }
  }

  /** Webhook de PayPal: JSON + firmas en headers. */
  async procesarWebhookPaypal(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("PagoController.procesarWebhookPaypal", {
      requestId: req.requestId,
    });
    try {
      const entry = {
        ...(req.body as Record<string, unknown>),
        headers: {
          "paypal-transmission-id": req.header("paypal-transmission-id") ?? "",
          "paypal-transmission-time":
            req.header("paypal-transmission-time") ?? "",
          "paypal-cert-url": req.header("paypal-cert-url") ?? "",
          "paypal-auth-algo": req.header("paypal-auth-algo") ?? "",
          "paypal-transmission-sig":
            req.header("paypal-transmission-sig") ?? "",
        },
      };
      const resultado = await pagoService.procesarWebhook(entry);
      logger.exito("PagoController.procesarWebhookPaypal completado", {
        estado: resultado.estado,
      });
      res.status(200).json({ ok: true, estado: resultado.estado });
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
