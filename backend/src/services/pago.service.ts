import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PagoModel, Pago } from "../models/pago.model";
import { PaqueteModel } from "../models/paquete.model";
import { UserModel } from "../models/user.model";
import {
  PaymentProvider,
  PaymentResult,
} from "../adapters/payment/payment-provider.interface";
import { createPaymentProvider } from "../adapters/payment/payment-provider.factory";
import { proyectoService } from "./proyecto.service";
import {
  NotificacionesService,
  notificacionesService,
} from "./notificaciones.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

interface PagoJson {
  id: string;
  paqueteSlug: string;
  descripcion: string;
  monto: number;
  moneda: string;
  emailCliente: string;
  estado: Pago["estado"];
  referencia: string | null;
  createdAt: Date;
}

function toJson(pago: Pago & { _id: unknown }): PagoJson {
  return {
    id: String(pago._id),
    paqueteSlug: pago.paqueteSlug,
    descripcion: pago.descripcion,
    monto: pago.monto,
    moneda: pago.moneda,
    emailCliente: pago.emailCliente,
    estado: pago.estado,
    referencia: pago.referencia ?? null,
    createdAt: pago.createdAt,
  };
}

export class PagoService {
  constructor(
    private readonly provider: PaymentProvider = createPaymentProvider(),
    private readonly notificaciones: NotificacionesService = notificacionesService,
  ) {}

  async crearCheckout(data: {
    paqueteId: string;
    email: string;
    clienteId?: string;
  }): Promise<{ urlPago: string | null; pago: PagoJson }> {
    logger.proceso("PagoService.crearCheckout", { paqueteId: data.paqueteId });

    const paquete = await PaqueteModel.findById(data.paqueteId).lean();
    if (!paquete || !paquete.activo) {
      logger.fracaso("PagoService.crearCheckout: paquete no disponible", {
        paqueteId: data.paqueteId,
      });
      throw ApiError.notFound("Paquete no disponible");
    }

    const email = data.email.trim().toLowerCase();
    const pago = await PagoModel.create({
      paqueteId: paquete._id,
      paqueteSlug: paquete.slug,
      descripcion: `${paquete.nombre} (${paquete.slug})`,
      monto: paquete.precio,
      moneda: paquete.moneda ?? "USD",
      emailCliente: email,
      clienteId: data.clienteId ?? null,
      estado: "pending",
    });

    const resultado: PaymentResult = await this.provider.createCheckout({
      amount: paquete.precio,
      currency: paquete.moneda ?? "USD",
      description: `${paquete.nombre} (${paquete.slug})`,
      clientEmail: email,
      metadata: {
        paqueteSlug: paquete.slug,
        pagoId: String(pago._id),
      },
    });

    if (resultado.paymentId) {
      pago.referencia = resultado.paymentId;
      await pago.save();
    }

    logger.exito("PagoService.crearCheckout completado", {
      pagoId: String(pago._id),
      urlPago: resultado.checkoutUrl ? "generada" : null,
    });

    return { urlPago: resultado.checkoutUrl, pago: toJson(pago.toObject()) };
  }

  /**
   * Procesa el webhook de ePayco. Flujo:
   * 1. Valida firma (el provider lanza ApiError si es inválida)
   * 2. Actualiza el estado del Pago
   * 3. Si está PAGADO: onboarding automático (cliente + proyecto) — idempotente
   */
  async procesarWebhook(body: Record<string, unknown>): Promise<{
    estado: Pago["estado"];
    onboarding?: { usuario?: string; proyecto?: string };
  }> {
    logger.proceso("PagoService.procesarWebhook");

    const evento = await this.provider.handleWebhook(body);
    if (!evento.paymentId) {
      logger.fracaso("PagoService.procesarWebhook: sin referencia de pago");
      throw ApiError.badRequest("Webhook sin referencia de pago");
    }

    const pago = await PagoModel.findOne({ referencia: evento.paymentId });
    if (!pago) {
      // Respondemos ok igual (no dejar que ePayco reintente infinitamente),
      // pero registramos el fracaso para auditoría.
      logger.fracaso("PagoService.procesarWebhook: pago no encontrado", {
        referencia: evento.paymentId,
      });
      return { estado: "pending" };
    }

    if (pago.estado === evento.status) {
      logger.exito(
        "PagoService.procesarWebhook: estado ya registrado (idempotente)",
        {
          pagoId: String(pago._id),
          estado: evento.status,
        },
      );
      return { estado: pago.estado };
    }

    pago.estado = evento.status;
    await pago.save();
    logger.exito("PagoService.procesarWebhook: estado actualizado", {
      pagoId: String(pago._id),
      estado: evento.status,
    });

    if (evento.status === "paid") {
      return this.ejecutarOnboarding(pago);
    }

    return { estado: evento.status };
  }

  private async ejecutarOnboarding(pago: {
    _id: unknown;
    clienteId?: unknown;
    emailCliente: string;
    paqueteId: unknown;
    paqueteSlug: string;
  }) {
    logger.proceso("PagoService.ejecutarOnboarding", {
      pagoId: String(pago._id),
    });

    let clienteId = pago.clienteId ? String(pago.clienteId) : null;
    let credencialesNuevas = false;
    let passwordTemporal = "";
    if (!clienteId) {
      const usuario = await this.findOrCreateCliente(pago.emailCliente);
      clienteId = usuario.id;
      credencialesNuevas = usuario.nuevo;
      passwordTemporal = usuario.passwordTemporal;
      await PagoModel.updateOne({ _id: pago._id }, { $set: { clienteId } });
    }

    const proyecto = await proyectoService.crearDesdeCompra(
      {
        _id: pago._id,
        paqueteId: pago.paqueteId,
        paqueteSlug: pago.paqueteSlug,
      },
      clienteId,
    );

    // Gatillo de notificaciones (Fase 6): credenciales + confirmación de compra.
    const paquete = await PaqueteModel.findById(pago.paqueteId).lean();
    const cliente = await UserModel.findById(clienteId).lean();
    try {
      if (credencialesNuevas && passwordTemporal) {
        await this.notificaciones.enviarCredenciales({
          email: pago.emailCliente,
          passwordTemporal,
        });
      }
      await this.notificaciones.enviarCompraConfirmada({
        email: pago.emailCliente,
        nombreCliente: cliente?.nombre ?? "cliente",
        paquete: paquete?.nombre ?? pago.paqueteSlug,
        fechaEntrega: proyecto.fechaEntrega,
      });
    } catch (error) {
      logger.fracaso(
        "PagoService.ejecutarOnboarding: fallo al notificar por correo",
        {
          pagoId: String(pago._id),
          error: (error as Error).message,
        },
      );
    }

    logger.exito("PagoService.ejecutarOnboarding completado", {
      clienteId,
      proyectoId: String(proyecto._id),
    });

    return {
      estado: "paid" as const,
      onboarding: { usuario: clienteId, proyecto: String(proyecto._id) },
    };
  }

  /**
   * Busca al cliente por email o lo crea (onboarding automático).
   * Si es nuevo, genera una contraseña temporal que se envía por correo.
   */
  private async findOrCreateCliente(
    email: string,
  ): Promise<{ id: string; nuevo: boolean; passwordTemporal: string }> {
    const existente = await UserModel.findOne({ email });
    if (existente) {
      return { id: String(existente._id), nuevo: false, passwordTemporal: "" };
    }

    const passwordTemporal = randomBytes(9).toString("base64url").slice(0, 12);
    const doc = await UserModel.create({
      email,
      passwordHash: bcrypt.hashSync(passwordTemporal, 12),
      nombre: "Cliente",
      rol: "cliente",
      activo: true,
    });

    return { id: String(doc._id), nuevo: true, passwordTemporal };
  }

  async listarMisPagos(clienteId: string): Promise<PagoJson[]> {
    logger.proceso("PagoService.listarMisPagos", { clienteId });
    const docs = await PagoModel.find({ clienteId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toJson);
  }

  async listarTodos(): Promise<PagoJson[]> {
    logger.proceso("PagoService.listarTodos");
    const docs = await PagoModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(toJson);
  }
}

export const pagoService = new PagoService();
