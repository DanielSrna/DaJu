import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PagoModel, Pago } from "../models/pago.model";
import { PaqueteModel } from "../models/paquete.model";
import { PlantillaModel } from "../models/plantilla.model";
import { ServicioModel } from "../models/servicio.model";
import { SolicitudFuncionModel } from "../models/solicitud-funcion.model";
import { BriefingModel } from "../models/briefing.model";
import { EspacioModel } from "../models/espacio.model";
import { ProyectoModel } from "../models/proyecto.model";
import { UserModel } from "../models/user.model";
import { CmsConfigModel } from "../models/cms-config.model";
import {
  PaymentProvider,
  PaymentResult,
} from "../adapters/payment/payment-provider.interface";
import { createPaymentProvider } from "../adapters/payment/payment-provider.factory";
import { proyectoService, CompraPago } from "./proyecto.service";
import { funcionalidadExtraService } from "./funcionalidad-extra.service";
import { espacioService } from "./espacio.service";
import {
  NotificacionesService,
  notificacionesService,
} from "./notificaciones.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export type TipoProducto =
  "paquete" | "plantilla" | "servicio" | "funcionalidad";

interface PagoJson {
  id: string;
  tipoProducto: TipoProducto;
  paqueteSlug: string;
  productoSlug: string;
  cantidad: number;
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

interface ItemCompra {
  tipo: TipoProducto;
  nombre: string;
  slug: string;
  precio: number;
  moneda: string;
  id: string;
}

const MAX_FUNCIONALIDADES = 10;
const MAX_SESIONES = 10;

function toJson(
  pago: Pago & { _id: unknown; productoSlug?: string },
): PagoJson {
  const metadata = (pago.metadata ?? {}) as {
    funcionalidades?: FuncionalidadSnapshot[];
    negociarDespues?: boolean;
  };
  return {
    id: String(pago._id),
    tipoProducto: (pago.tipoProducto ?? "paquete") as TipoProducto,
    paqueteSlug: pago.paqueteSlug,
    productoSlug: pago.productoSlug ?? "",
    cantidad: pago.cantidad ?? 1,
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
    tipoProducto?: TipoProducto;
    paqueteId?: string;
    productoId?: string;
    email: string;
    nombre?: string;
    password?: string;
    funcionalidades?: string[];
    negociarDespues?: boolean;
    cantidad?: number;
  }): Promise<{ urlPago: string | null; pago: PagoJson }> {
    logger.proceso("PagoService.crearCheckout", {
      tipoProducto: data.tipoProducto ?? "paquete",
      productoId: data.productoId ?? data.paqueteId,
    });

    const tipo = (data.tipoProducto ?? "paquete") as TipoProducto;
    const item = await this.resolverItem(tipo, data);
    if (!item) {
      logger.fracaso("PagoService.crearCheckout: ítem no disponible", {
        tipo,
        productId: data.productoId ?? data.paqueteId,
      });
      throw ApiError.notFound("Producto no disponible");
    }

    const email = data.email.trim().toLowerCase();

    // Descuento global anunciado en la vitrina: solo aplica a paquetes y
    // plantillas (la consultoría se vende a precio pleno) y solo si la
    // marquesina está activa con descuento vigente (regla: sin anuncio,
    // no hay descuento). No aplica a funcionalidades/sesiones adicionales.
    const configCms = await CmsConfigModel.findOne({}).lean();
    let factorDescuento = 1;
    if (
      tipo !== "servicio" &&
      configCms?.marquesina?.activo &&
      configCms?.descuento?.activo &&
      [20, 40, 70].includes(configCms.descuento.porcentaje)
    ) {
      factorDescuento = 1 - configCms.descuento.porcentaje / 100;
    }

    // Servicios: el precio es por sesión; se vende en bloques de 1..10.
    const cantidad =
      tipo === "servicio"
        ? Math.min(Math.max(Math.floor(data.cantidad ?? 1), 1), MAX_SESIONES)
        : 1;
    const conFuncionalidades = tipo === "paquete" || tipo === "plantilla";
    const idsFuncionalidades = conFuncionalidades
      ? [...new Set(data.funcionalidades ?? [])]
      : [];
    if (idsFuncionalidades.length > MAX_FUNCIONALIDADES) {
      throw ApiError.validation(
        `Máximo ${MAX_FUNCIONALIDADES} funcionalidades adicionales por producto`,
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

    const montoBase = Math.floor(item.precio * factorDescuento);
    const montoTotal =
      montoBase * cantidad +
      funcionalidades.reduce((suma, f) => suma + f.precio, 0);
    const descripcion = this.montarDescripcion(
      item,
      tipo,
      cantidad,
      funcionalidades.length,
    );

    const pago = await PagoModel.create({
      tipoProducto: tipo,
      paqueteId: tipo === "paquete" ? item.id : null,
      productoId: tipo === "paquete" ? null : item.id,
      paqueteSlug: item.slug,
      productoSlug: tipo === "paquete" ? "" : item.slug,
      cantidad,
      descripcion,
      monto: montoTotal,
      moneda: item.moneda,
      emailCliente: email,
      clienteId,
      estado: "pending",
      metadata: {
        funcionalidades,
        negociarDespues: data.negociarDespues ?? false,
      },
    });

    const resultado: PaymentResult = await this.crearCheckoutConFallback({
      amount: montoTotal,
      currency: item.moneda,
      description: descripcion,
      clientEmail: email,
      metadata: {
        paqueteSlug: item.slug,
        tipoProducto: tipo,
        pagoId: String(pago._id),
      },
    });

    if (resultado.paymentId) {
      pago.referencia = resultado.paymentId;
      await pago.save();
    }

    logger.exito("PagoService.crearCheckout completado", {
      pagoId: String(pago._id),
      tipoProducto: tipo,
      urlPago: resultado.checkoutUrl ? "generada" : null,
      montoTotal,
      funcionalidades: funcionalidades.length,
      cantidad,
    });

    return { urlPago: resultado.checkoutUrl, pago: toJson(pago.toObject()) };
  }

  /** Resuelve el ítem comprado según su tipo (siempre desde el catálogo). */
  private async resolverItem(
    tipo: TipoProducto,
    data: { paqueteId?: string; productoId?: string },
  ): Promise<ItemCompra | null> {
    const id =
      tipo === "paquete"
        ? (data.paqueteId ?? data.productoId)
        : data.productoId;
    if (!id) return null;

    if (tipo === "paquete") {
      const doc = await PaqueteModel.findById(id).lean();
      if (!doc || !doc.activo) return null;
      return {
        tipo,
        nombre: doc.nombre,
        slug: doc.slug,
        precio: doc.precio,
        moneda: doc.moneda ?? "USD",
        id,
      };
    }
    if (tipo === "plantilla") {
      const doc = await PlantillaModel.findById(id).lean();
      if (!doc || !doc.activo) return null;
      return {
        tipo,
        nombre: doc.nombre,
        slug: doc.slug,
        precio: doc.precio,
        moneda: doc.moneda ?? "USD",
        id,
      };
    }
    const doc = await ServicioModel.findById(id).lean();
    if (!doc || !doc.activo) return null;
    return {
      tipo,
      nombre: doc.nombre,
      slug: doc.slug,
      precio: doc.precio,
      moneda: doc.moneda ?? "USD",
      id,
    };
  }

  private montarDescripcion(
    item: ItemCompra,
    tipo: TipoProducto,
    cantidad: number,
    funcionalidades: number,
  ): string {
    const base =
      tipo === "servicio"
        ? cantidad > 1
          ? `${item.nombre} × ${cantidad} sesiones`
          : `${item.nombre} (1 sesión)`
        : funcionalidades
          ? `${item.nombre} + ${funcionalidades} funcionalidad(es) extra`
          : `${item.nombre} (${item.slug})`;
    return base;
  }

  /**
   * Aceptar y pagar una solicitud de función adicional desde el entorno.
   * Crea el pago pendiente (tipoProducto "funcionalidad") y devuelve la URL.
   * Solo puede existir un pago en curso por solicitud.
   */
  async checkoutSolicitud(
    solicitudId: string,
    clienteId: string,
  ): Promise<{ urlPago: string | null; pago: PagoJson }> {
    logger.proceso("PagoService.checkoutSolicitud", { solicitudId });

    const solicitud = await SolicitudFuncionModel.findById(solicitudId).lean();
    if (!solicitud) throw ApiError.notFound("Solicitud no encontrada");

    // Propietario: espacio de plantilla/servicio o proyecto de paquete.
    if (solicitud.proyectoId) {
      const proyecto = await ProyectoModel.findOne({
        _id: solicitud.proyectoId,
        clienteId,
      });
      if (!proyecto)
        throw ApiError.forbidden("No tienes acceso a esta solicitud");
    } else {
      const espacio = await EspacioModel.findOne({
        _id: solicitud.espacioId,
        clienteId,
      });
      if (!espacio)
        throw ApiError.forbidden("No tienes acceso a esta solicitud");
    }

    const enCurso = await PagoModel.findOne({
      tipoProducto: "funcionalidad",
      productoId: solicitudId,
      estado: { $in: ["pending", "paid"] },
    });
    if (enCurso) {
      throw ApiError.conflict(
        "Esta solicitud ya tiene un pago en curso; revisa tu portal de pagos",
      );
    }

    if (solicitud.estado !== "respondida") {
      throw ApiError.validation(
        "Solo se pueden pagar solicitudes ya respondidas con costo",
      );
    }
    const usuario = await UserModel.findById(clienteId).lean();
    const emailCliente = usuario?.email ?? "";

    const monto = Number(solicitud.costo ?? 0);
    if (monto <= 0) {
      throw ApiError.validation("La solicitud no tiene un costo definido");
    }

    await SolicitudFuncionModel.updateOne(
      { _id: solicitudId },
      { $set: { estado: "aceptada" } },
    );

    const pago = await PagoModel.create({
      tipoProducto: "funcionalidad",
      paqueteSlug: solicitud.titulo.slice(0, 60),
      productoSlug: solicitud.titulo,
      productoId: solicitudId,
      cantidad: 1,
      descripcion: `Función adicional: ${solicitud.titulo}`,
      monto,
      moneda: "USD",
      emailCliente,
      clienteId,
      estado: "pending",
      metadata: { solicitudId },
    });

    const resultado: PaymentResult = await this.crearCheckoutConFallback({
      amount: monto,
      currency: "USD",
      description: pago.descripcion,
      clientEmail: emailCliente,
      metadata: {
        pagoId: String(pago._id),
        tipoProducto: "funcionalidad",
      },
    });

    if (resultado.paymentId) {
      pago.referencia = resultado.paymentId;
      await pago.save();
    }

    logger.exito("PagoService.checkoutSolicitud completado", {
      pagoId: String(pago._id),
      monto,
      urlPago: resultado.checkoutUrl ? "generada" : null,
    });
    return { urlPago: resultado.checkoutUrl, pago: toJson(pago.toObject()) };
  }

  /**
   * Intenta con la pasarela activa; si falla, cae a ePayco (multi-proveedor).
   */
  private async crearCheckoutConFallback(
    params: Parameters<PaymentProvider["createCheckout"]>[0],
  ): Promise<PaymentResult> {
    try {
      return await this.provider.createCheckout(params);
    } catch (errorPrimario) {
      logger.fracaso(
        "PagoService.crearCheckoutConFallback: pasarela activa falló",
        {
          error: (errorPrimario as Error).message,
        },
      );
      if (process.env.PAYMENT_PROVIDER === "mercadopago") {
        try {
          const { EpaycoPaymentProvider } =
            await import("../adapters/payment/epayco/epayco-payment.provider");
          const ePayco = new EpaycoPaymentProvider();
          const resultado = await ePayco.createCheckout(params);
          logger.exito(
            "PagoService.crearCheckoutConFallback: reemplazo por ePayco OK",
            { checkoutUrl: resultado.checkoutUrl ? "generada" : null },
          );
          return resultado;
        } catch {
          // si ePayco tampoco está configurado, se devuelve el error original
        }
      }
      throw errorPrimario;
    }
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
    tipoProducto?: string;
    paqueteId?: unknown;
    paqueteSlug: string;
    productoId?: unknown;
    productoSlug?: string;
    cantidad?: number;
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

    const tipo = (pago.tipoProducto ?? "paquete") as TipoProducto;
    const nombreProducto = await this.nombreProducto(tipo, pago);
    const fechaEntregaPago: Date | null =
      tipo === "paquete" ? await this.crearProyecto(pago, clienteId) : null;

    // Funcionalidad adicional pagada desde el entorno: marca la solicitud.
    if (tipo === "funcionalidad") {
      await this.marcarSolicitudPagada(pago);
    }

    // Plantillas y servicios: el entorno nace del pago confirmado.
    if (tipo === "plantilla" || tipo === "servicio") {
      await this.crearEspacioDesdePago(pago, clienteId, tipo);
    }

    // Gatillo de notificaciones: credenciales + confirmación de compra.
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
        producto: nombreProducto,
        detalle: this.detalleCompra(tipo),
        fechaEntrega: fechaEntregaPago,
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

    // Notificación de plataforma: nueva compra confirmada (nivel 1).
    try {
      await import("./notificacion.service").then(({ notificacionService }) =>
        notificacionService.crearAdmins({
          tipo: "plataforma",
          titulo: "Nueva compra confirmada",
          cuerpo: `${nombreProducto} · $${(pago as { monto?: number }).monto ?? ""} — ${cliente?.nombre ?? pago.emailCliente}`,
          contexto: "compra",
          contextoId: pago._id,
        }),
      );
    } catch (error) {
      logger.fracaso("PagoService: notificación de compra falló", {
        error: (error as Error).message,
      });
    }

    logger.exito("PagoService.ejecutarOnboarding completado", {
      clienteId,
      tipoProducto: tipo,
      proyectoId: fechaEntregaPago ? "creado" : null,
    });

    return {
      estado: "paid" as const,
      onboarding: {
        usuario: clienteId,
        ...(fechaEntregaPago ? { proyecto: "creado" } : {}),
      },
    };
  }

  /** Crea el proyecto del paquete (solo paquetes) y devuelve su fecha de entrega. */
  private async crearProyecto(
    pago: {
      _id: unknown;
      paqueteId?: unknown;
      paqueteSlug: string;
      metadata?: unknown;
    },
    clienteId: string,
  ): Promise<Date> {
    if (!pago.paqueteId) {
      throw new Error(
        `No se puede crear el proyecto del pago ${String(pago._id)}: sin paqueteId`,
      );
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
    return proyecto.fechaEntrega;
  }

  /** Funcionalidad pagada → solicitud "pagada" y la vista queda lista. */
  private async marcarSolicitudPagada(pago: {
    productoId?: unknown;
  }): Promise<void> {
    if (!pago.productoId) return;
    const solicitud = await SolicitudFuncionModel.findById(pago.productoId);
    if (!solicitud) return;
    solicitud.estado = "pagada";
    await solicitud.save();

    // Vista de plantilla: al pagar pasa de “En cotización” a “Pendiente”.
    if (solicitud.espacioId) {
      try {
        const { VistaDisenoModel } =
          await import("../models/vista-diseno.model");
        const vista = await VistaDisenoModel.findOne({
          espacioId: solicitud.espacioId,
          nombre: solicitud.titulo,
        });
        if (vista) {
          vista.estado = "pendiente";
          await vista.save();
        }
      } catch (error) {
        logger.fracaso("PagoService: VistaDiseno update falló", {
          error: (error as Error).message,
        });
      }
    }
    // Si la solicitud nació de una vista del proyecto, la vista queda
    // "pendiente" (paga → cola de desarrollo).
    if (solicitud.proyectoId) {
      const briefing = await BriefingModel.findOne({
        proyectoId: solicitud.proyectoId,
        "contenido.vistas.nombre": solicitud.titulo,
      });
      if (briefing) {
        const lista = (briefing.contenido?.vistas ?? []) as unknown as Array<{
          nombre?: string;
          semaforo?: string;
        }>;
        const vista = lista.find((v) => v.nombre === solicitud.titulo);
        if (vista) {
          vista.semaforo = "pendiente"; // paga → pasa a la cola de desarrollo
          briefing.markModified("contenido.vistas");
          await briefing.save();
          logger.exito("PagoService.marcarSolicitudPagada: vista aprobada", {
            proyectoId: String(solicitud.proyectoId),
            titulo: solicitud.titulo,
          });
        }
      }
    }

    logger.exito("PagoService.marcarSolicitudPagada", {
      solicitudId: String(pago.productoId),
    });
  }

  /** Crea el espacio del entorno no-paquete (idempotente por pago). */
  private async crearEspacioDesdePago(
    pago: {
      _id: unknown;
      tipoProducto?: string;
      productoId?: unknown;
      productoSlug?: string;
      cantidad?: number;
    },
    clienteId: string,
    tipo: TipoProducto,
  ): Promise<void> {
    try {
      const espacio = await espacioService.crearDesdePago({
        pagoId: String(pago._id),
        clienteId,
        tipoProducto: tipo as "plantilla" | "servicio",
        productoId: String(pago.productoId),
        productoSlug: pago.productoSlug ?? "",
        sesionesTotal: tipo === "servicio" ? (pago.cantidad ?? 1) : 1,
      });
      logger.exito("PagoService.crearEspacioDesdePago completado", {
        espacioId: espacio.id,
      });
    } catch (error) {
      logger.fracaso(
        "PagoService.crearEspacioDesdePago: falló (no bloquea el pago)",
        {
          pagoId: String(pago._id),
          error: (error as Error).message,
        },
      );
    }
  }

  private async nombreProducto(
    tipo: TipoProducto,
    pago: {
      paqueteSlug: string;
      productoSlug?: string;
      productoId?: unknown;
      paqueteId?: unknown;
    },
  ): Promise<string> {
    if (tipo === "plantilla") {
      const doc = await PlantillaModel.findById(
        pago.productoId ?? pago.paqueteId,
      ).lean();
      if (doc) return doc.nombre;
    }
    if (tipo === "servicio") {
      const doc = await ServicioModel.findById(
        pago.productoId ?? pago.paqueteId,
      ).lean();
      if (doc) return doc.nombre;
    }
    const doc = await PaqueteModel.findById(pago.paqueteId).lean();
    return doc?.nombre ?? pago.paqueteSlug;
  }

  private detalleCompra(tipo: TipoProducto): string {
    if (tipo === "funcionalidad") {
      return "La función adicional ya se suma a tu entorno: el equipo la entra al plan de construcción.";
    }
    if (tipo === "paquete") {
      return "Tu proyecto ya fue creado y está en marcha. Completa tu briefing para que empecemos cuanto antes.";
    }
    if (tipo === "plantilla") {
      return "Tu plantilla es tuya: pronto podrás ver sus vistas, discutir el diseño y pedir funcionalidades adicionales desde tu espacio de trabajo.";
    }
    return "Sesiones listas: agendaremos tus citas en el canal que elegiste. El enlace y los materiales llegaran a tu espacio de consultoría.";
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

  /** Admin: reembolso total de un pago pagado. */
  async refundar(id: string, adminId: string): Promise<PagoJson> {
    logger.proceso("PagoService.refundar", { id });
    const pago = await PagoModel.findById(id);
    if (!pago) throw ApiError.notFound("Pago no encontrado");
    if (pago.estado !== "paid") {
      throw ApiError.validation("Solo se pueden reembolsar pagos confirmados");
    }
    if (!pago.referencia) {
      throw ApiError.validation("El pago no tiene referencia de pasarela");
    }
    if (this.provider.refund) {
      await this.provider.refund(pago.referencia);
    } else {
      throw ApiError.badRequest(
        "La pasarela activa no soporta reembolsos desde la plataforma",
      );
    }
    pago.estado = "refunded";
    await pago.save();
    void import("./notificacion.service").then(({ notificacionService }) =>
      notificacionService.crearAdmins({
        tipo: "plataforma",
        titulo: "Pago reembolsado",
        cuerpo: `${pago.descripcion} · $${pago.monto}`,
        contexto: "compra",
        contextoId: pago._id,
        creadaPor: adminId,
      }),
    );
    logger.exito("PagoService.refundar completado", { id });
    return toJson(pago.toObject());
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
