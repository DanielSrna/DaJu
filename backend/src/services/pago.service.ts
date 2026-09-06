import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PagoModel, Pago } from "../models/pago.model";
import { PaqueteModel } from "../models/paquete.model";
import { UserModel } from "../models/user.model";
import { CmsConfigModel } from "../models/cms-config.model";
import {
  PaymentProvider,
  PaymentResult,
} from "../adapters/payment/payment-provider.interface";
import { createPaymentProvider } from "../adapters/payment/payment-provider.factory";
import { proyectoService, CompraPago } from "./proyecto.service";
import { funcionalidadExtraService } from "./funcionalidad-extra.service";
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
  funcionalidades: Array<{
    id: string;
    nombre: string;
    categoria: string;
    complejidad: string;
    precio: number;
  }>;
  negociarDespues: boolean;
  createdAt: Date;
}

interface FuncionalidadSnapshot {
  id: string;
  nombre: string;
  categoria: string;
  complejidad: string;
  precio: number;
}

const MAX_FUNCIONALIDADES = 10;

function toJson(pago: Pago & { _id: unknown }): PagoJson {
  const metadata = (pago.metadata ?? {}) as {
    funcionalidades?: FuncionalidadSnapshot[];
    negociarDespues?: boolean;
  };
  return {
    id: String(pago._id),
    paqueteSlug: pago.paqueteSlug,
    descripcion: pago.descripcion,
    monto: pago.monto,
    moneda: pago.moneda,
    emailCliente: pago.emailCliente,
    estado: pago.estado,
    referencia: pago.referencia ?? null,
    funcionalidades: metadata.funcionalidades ?? [],
    negociarDespues: metadata.negociarDespues ?? false,
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
    nombre?: string;
    password?: string;
    funcionalidades?: string[];
    negociarDespues?: boolean;
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

    // Descuento global anunciado en la vitrina: solo aplica si la marquesina
    // está activa y hay un descuento vigente (regla del dueño: sin anuncio,
    // no hay descuento). Aplica únicamente al paquete base.
    const configCms = await CmsConfigModel.findOne({}).lean();
    let factorDescuento = 1;
    if (
      configCms?.marquesina?.activo &&
      configCms?.descuento?.activo &&
      [20, 40, 70].includes(configCms.descuento.porcentaje)
    ) {
      factorDescuento = 1 - configCms.descuento.porcentaje / 100;
    }

    // Resolver funcionalidades adicionales (sin duplicados, solo activas, máx 10).
    const idsFuncionalidades = [...new Set(data.funcionalidades ?? [])];
    if (idsFuncionalidades.length > MAX_FUNCIONALIDADES) {
      throw ApiError.validation(
        `Máximo ${MAX_FUNCIONALIDADES} funcionalidades adicionales por paquete`,
      );
    }
    const funcionalidades = idsFuncionalidades.length
      ? await funcionalidadExtraService.resolverActivas(idsFuncionalidades)
      : [];

    // Registrar/validar la cuenta del comprador antes de pagar.
    const datosCuenta: { email: string; nombre?: string; password?: string } = {
      email,
    };
    if (data.nombre !== undefined) datosCuenta.nombre = data.nombre;
    if (data.password !== undefined) datosCuenta.password = data.password;
    const clienteId = await this.resolverOCrearCliente(datosCuenta);

    const montoTotal =
      Math.floor(paquete.precio * factorDescuento) +
      funcionalidades.reduce((suma, f) => suma + f.precio, 0);
    const descripcion = funcionalidades.length
      ? `${paquete.nombre} + ${funcionalidades.length} funcionalidad(es) extra`
      : `${paquete.nombre} (${paquete.slug})`;

    const pago = await PagoModel.create({
      paqueteId: paquete._id,
      paqueteSlug: paquete.slug,
      descripcion,
      monto: montoTotal,
      moneda: paquete.moneda ?? "USD",
      emailCliente: email,
      clienteId,
      estado: "pending",
      metadata: {
        funcionalidades,
        negociarDespues: data.negociarDespues ?? false,
      },
    });

    const resultado: PaymentResult = await this.provider.createCheckout({
      amount: montoTotal,
      currency: paquete.moneda ?? "USD",
      description: descripcion,
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
      montoTotal,
      funcionalidades: funcionalidades.length,
    });

    return { urlPago: resultado.checkoutUrl, pago: toJson(pago.toObject()) };
  }

  /**
   * Si el email no existe: crea la cuenta (rol cliente, activo).
   * Si existe: valida la contraseña. Las cuentas admin no pueden comprar.
   */
  private async resolverOCrearCliente(data: {
    email: string;
    nombre?: string;
    password?: string;
  }): Promise<string> {
    const existente = await UserModel.findOne({ email: data.email }).select(
      "+passwordHash",
    );
    if (existente) {
      if (existente.rol !== "cliente") {
        throw ApiError.validation(
          "Las cuentas de administrador no pueden comprar",
        );
      }
      if (
        !data.password ||
        !bcrypt.compareSync(data.password, existente.passwordHash)
      ) {
        logger.fracaso(
          "PagoService.resolverOCrearCliente: contraseña incorrecta",
          {
            email: data.email,
          },
        );
        throw ApiError.unauthorized(
          "Ya existe una cuenta con este email. Inicia sesión con tu contraseña.",
        );
      }
      return String(existente._id);
    }

    if (!data.nombre || !data.password) {
      throw ApiError.validation(
        "Nombre y contraseña son obligatorios para crear tu cuenta",
      );
    }
    const doc = await UserModel.create({
      email: data.email,
      passwordHash: bcrypt.hashSync(data.password, 12),
      nombre: data.nombre.trim(),
      rol: "cliente",
      activo: true,
    });
    logger.exito(
      "PagoService.resolverOCrearCliente: cuenta creada en el checkout",
      {
        email: data.email,
        userId: String(doc._id),
      },
    );
    return String(doc._id);
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
    metadata?: unknown;
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

    const datosPago = {
      _id: pago._id,
      paqueteId: pago.paqueteId,
      paqueteSlug: pago.paqueteSlug,
      ...(pago.metadata
        ? { metadata: pago.metadata as CompraPago["metadata"] }
        : {}),
    } as CompraPago;
    const proyecto = await proyectoService.crearDesdeCompra(
      datosPago,
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
