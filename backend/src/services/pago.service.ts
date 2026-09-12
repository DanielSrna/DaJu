import { randomBytes, randomInt } from "crypto";
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
import { StorageProvider } from "../adapters/storage/storage-provider.interface";
import { createStorageProvider } from "../adapters/storage/storage-provider.factory";
import {
  detectarTipoArchivo,
  optimizarImagen,
  TIPOS_ARCHIVO,
  TIPOS_IMAGEN,
} from "../utils/archivos";
import { proyectoService, CompraPago } from "./proyecto.service";
import { funcionalidadExtraService } from "./funcionalidad-extra.service";
import { espacioService } from "./espacio.service";
import { productoService, ItemCompra } from "./producto.service";
import { cuentaService } from "./cuenta.service";
import { metodoPagoService } from "./metodo-pago.service";
import type { MetodoPagoJson } from "./metodo-pago.service";
import {
  NotificacionesService,
  notificacionesService,
} from "./notificaciones.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

import type { TipoProducto } from "./producto.service";
export type { TipoProducto };

export interface PagoJson {
  id: string;
  tipoProducto: TipoProducto;
  tipoPago: "total" | "etapa" | "sesiones" | "funcionalidad";
  paqueteSlug: string;
  productoSlug: string;
  cantidad: number;
  descripcion: string;
  monto: number;
  moneda: string;
  montoCop: number | null;
  emailCliente: string;
  estado: Pago["estado"];
  referencia: string | null;
  metodoPago: string;
  codigo: string;
  comprobante: {
    url: string;
    nombre: string;
    subidoEn: Date | null;
  } | null;
  referenciaCliente: string;
  proyectoId: string;
  espacioId: string;
  etapaId: string;
  motivoRechazo: string;
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

/** Archivo subido por multer (comprobantes de pago). */
export interface ArchivoSubido {
  buffer: Buffer;
  nombre: string;
  tamañoBytes: number;
}

interface FuncionalidadSnapshot {
  id: string;
  nombre: string;
  categoria: string;
  complejidad: string;
  precio: number;
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
    tipoPago: (pago.tipoPago ?? "total") as PagoJson["tipoPago"],
    paqueteSlug: pago.paqueteSlug,
    productoSlug: pago.productoSlug ?? "",
    cantidad: pago.cantidad ?? 1,
    descripcion: pago.descripcion,
    monto: pago.monto,
    moneda: pago.moneda,
    montoCop: pago.montoCop ?? null,
    emailCliente: pago.emailCliente,
    estado: pago.estado,
    referencia: pago.referencia ?? null,
    metodoPago: pago.metodoPago ?? "",
    codigo: pago.codigo ?? "",
    comprobante: pago.comprobante?.url
      ? {
          url: pago.comprobante.url,
          nombre: pago.comprobante.nombre ?? "",
          subidoEn: pago.comprobante.subidoEn ?? null,
        }
      : null,
    referenciaCliente: pago.referenciaCliente ?? "",
    proyectoId: pago.proyectoId ? String(pago.proyectoId) : "",
    espacioId: pago.espacioId ? String(pago.espacioId) : "",
    etapaId: pago.etapaId ?? "",
    motivoRechazo: pago.motivoRechazo ?? "",
    funcionalidades: metadata.funcionalidades ?? [],
    negociarDespues: metadata.negociarDespues ?? false,
    createdAt: pago.createdAt,
  };
}

export class PagoService {
  constructor(
    private readonly provider: PaymentProvider = createPaymentProvider(),
    private readonly notificaciones: NotificacionesService = notificacionesService,
    private readonly storage: StorageProvider = createStorageProvider(),
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
    const item = await productoService.resolverItem(tipo, data);
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
    const { id: clienteId } =
      await cuentaService.resolverOCrearCliente(datosCuenta);

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

    const resultado: PaymentResult = await this.provider.createCheckout({
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
   * Aceptar una solicitud de función adicional desde el entorno.
   * Crea el pago pendiente (tipoProducto "funcionalidad") con su código único;
   * el cliente elige el método en la página de pago del portal.
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
      estado: { $in: ["pending", "en_revision", "rechazado", "paid"] },
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
      tipoPago: "funcionalidad",
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
      codigo: await this.generarCodigo(),
      metadata: { solicitudId },
    });

    logger.exito("PagoService.checkoutSolicitud completado", {
      pagoId: String(pago._id),
      monto,
    });
    return { urlPago: null, pago: toJson(pago.toObject()) };
  }

  /**
   * Admin: habilita un pago para el cliente (etapa del plan o sesiones de
   * consultoría). Genera el código único que el cliente escribe en su
   * transacción y le avisa por correo y por la campana del portal.
   */
  async solicitarPago(
    data: {
      proyectoId?: string;
      espacioId?: string;
      etapaId?: string;
      tipoPago: "etapa" | "sesiones";
      monto: number;
      cantidad?: number;
      descripcion?: string;
    },
    adminId: string,
  ): Promise<PagoJson> {
    logger.proceso("PagoService.solicitarPago", {
      tipoPago: data.tipoPago,
      etapaId: data.etapaId,
    });
    if (!data.proyectoId && !data.espacioId) {
      throw ApiError.validation("Indica el proyecto o el espacio a cobrar");
    }
    if (!(data.monto > 0)) {
      throw ApiError.validation("El monto debe ser mayor a 0");
    }

    let tipoProducto: TipoProducto = "paquete";
    let emailCliente = "";
    let clienteId: string | null = null;
    let moneda = "USD";
    let paqueteSlug = "";
    let productoSlug = "";
    let concepto = data.descripcion ?? "";
    const cantidad =
      data.tipoPago === "sesiones"
        ? Math.max(1, Math.floor(data.cantidad ?? 1))
        : 1;

    if (data.proyectoId) {
      const proyecto = await ProyectoModel.findById(data.proyectoId);
      if (!proyecto) throw ApiError.notFound("Proyecto no encontrado");
      tipoProducto = "paquete";
      paqueteSlug = proyecto.paquete?.slug ?? "";
      moneda = proyecto.moneda ?? "USD";
      clienteId = String(proyecto.clienteId);
      const usuario = await UserModel.findById(proyecto.clienteId).lean();
      emailCliente = usuario?.email ?? "";
      if (data.tipoPago === "etapa") {
        if (!data.etapaId) {
          throw ApiError.validation("Falta la etapa a cobrar");
        }
        const etapas = proyecto.etapas as unknown as Array<{
          _id: unknown;
          nombre: string;
          pagoEstado: string;
        }>;
        const etapa = etapas.find((e) => String(e._id) === data.etapaId);
        if (!etapa) throw ApiError.notFound("Etapa no encontrada");
        if (etapa.pagoEstado === "pagado") {
          throw ApiError.conflict("Esta etapa ya está pagada");
        }
        concepto = concepto || `Etapa: ${etapa.nombre}`;
      }
    } else if (data.espacioId) {
      const espacio = await EspacioModel.findById(data.espacioId);
      if (!espacio) throw ApiError.notFound("Espacio no encontrado");
      tipoProducto = espacio.tipoProducto;
      productoSlug = espacio.productoSlug;
      moneda = espacio.moneda ?? "USD";
      clienteId = String(espacio.clienteId);
      const usuario = await UserModel.findById(espacio.clienteId).lean();
      emailCliente = usuario?.email ?? "";
      if (data.tipoPago === "etapa") {
        if (!data.etapaId) {
          throw ApiError.validation("Falta la etapa a cobrar");
        }
        const etapas = espacio.etapas as unknown as Array<{
          _id: unknown;
          nombre: string;
          pagoEstado: string;
        }>;
        const etapa = etapas.find((e) => String(e._id) === data.etapaId);
        if (!etapa) throw ApiError.notFound("Etapa no encontrada");
        if (etapa.pagoEstado === "pagado") {
          throw ApiError.conflict("Esta etapa ya está pagada");
        }
        concepto = concepto || `Etapa: ${etapa.nombre}`;
      }
    }

    if (!emailCliente) {
      throw ApiError.validation("El cliente no tiene email registrado");
    }

    if (data.etapaId) {
      const enCurso = await PagoModel.findOne({
        etapaId: data.etapaId,
        estado: { $in: ["pending", "en_revision"] },
      });
      if (enCurso) {
        throw ApiError.conflict("Esta etapa ya tiene un pago en curso");
      }
    }

    const codigo = await this.generarCodigo();
    const pago = await PagoModel.create({
      tipoProducto,
      tipoPago: data.tipoPago,
      paqueteSlug,
      productoSlug,
      cantidad,
      descripcion: concepto || "Pago de proyecto",
      monto: data.monto,
      moneda,
      emailCliente,
      clienteId,
      estado: "pending",
      codigo,
      solicitadoPor: adminId,
      proyectoId: data.proyectoId ?? null,
      espacioId: data.espacioId ?? null,
      etapaId: data.etapaId ?? "",
    });

    if (data.etapaId) {
      if (data.proyectoId) {
        await ProyectoModel.updateOne(
          { _id: data.proyectoId, "etapas._id": data.etapaId },
          {
            $set: {
              "etapas.$.pagoEstado": "solicitado",
              "etapas.$.pagoId": pago._id,
            },
          },
        );
      } else if (data.espacioId) {
        await EspacioModel.updateOne(
          { _id: data.espacioId, "etapas._id": data.etapaId },
          {
            $set: {
              "etapas.$.pagoEstado": "solicitado",
              "etapas.$.pagoId": pago._id,
            },
          },
        );
      }
    }

    try {
      const usuario = clienteId
        ? await UserModel.findById(clienteId).lean()
        : null;
      if (usuario?.email) {
        await this.notificaciones.enviarPagoSolicitado({
          email: usuario.email,
          cliente: usuario.nombre,
          concepto: pago.descripcion,
          monto: pago.monto,
          moneda: pago.moneda,
          codigo,
        });
      }
      if (clienteId) {
        const { notificacionService } = await import("./notificacion.service");
        await notificacionService.crearCliente(clienteId, {
          tipo: "proyecto",
          titulo: "Pago habilitado",
          cuerpo: `${pago.descripcion} · $${pago.monto} ${pago.moneda} · código ${codigo}`,
          contexto: "compra",
          contextoId: pago._id,
          creadaPor: adminId,
        });
      }
    } catch (error) {
      logger.fracaso("PagoService.solicitarPago: notificación falló", {
        error: (error as Error).message,
      });
    }

    logger.exito("PagoService.solicitarPago completado", {
      pagoId: String(pago._id),
      codigo,
    });
    return toJson(pago.toObject());
  }

  /**
   * Cliente: elige el método de pago. PayPal devuelve la URL de aprobación;
   * los métodos manuales devuelven instrucciones y el monto en COP congelado.
   */
  async elegirMetodo(
    pagoId: string,
    clienteId: string,
    claveMetodo: string,
  ): Promise<{
    pago: PagoJson;
    metodo: MetodoPagoJson;
    montoCop: number | null;
    urlPago: string | null;
  }> {
    logger.proceso("PagoService.elegirMetodo", { pagoId, claveMetodo });
    const pago = await PagoModel.findOne({ _id: pagoId, clienteId });
    if (!pago) throw ApiError.notFound("Pago no encontrado");
    if (["paid", "refunded"].includes(pago.estado)) {
      throw ApiError.conflict("Este pago ya está cerrado");
    }

    const metodo = await metodoPagoService.obtenerPorClave(claveMetodo);
    pago.metodoPago = metodo.clave;

    let montoCop: number | null = null;
    if (metodo.moneda === "COP") {
      // La tasa se congela una sola vez por pago; no se recalcula al re-elegir.
      if (pago.montoCop == null) {
        const cms = await CmsConfigModel.findOne({}).lean();
        const tasa = cms?.tasaCop ?? 0;
        if (tasa > 0) {
          pago.montoCop = Math.ceil(pago.monto * tasa);
        }
      }
      montoCop = pago.montoCop ?? null;
    }

    let urlPago: string | null = null;
    if (metodo.tipo === "paypal") {
      const resultado = await this.provider.createCheckout({
        amount: pago.monto,
        currency: pago.moneda,
        description: pago.descripcion,
        clientEmail: pago.emailCliente,
        metadata: { pagoId: String(pago._id) },
      });
      if (resultado.paymentId) pago.referencia = resultado.paymentId;
      urlPago = resultado.checkoutUrl;
    }

    await pago.save();
    logger.exito("PagoService.elegirMetodo completado", {
      pagoId,
      metodo: metodo.clave,
      urlPago: urlPago ? "generada" : null,
    });
    return { pago: toJson(pago.toObject()), metodo, montoCop, urlPago };
  }

  /** Cliente: sube el comprobante de una transferencia (imagen o PDF). */
  async subirComprobante(
    pagoId: string,
    clienteId: string,
    archivo: ArchivoSubido,
    referenciaCliente?: string,
  ): Promise<PagoJson> {
    logger.proceso("PagoService.subirComprobante", { pagoId });
    const pago = await PagoModel.findOne({ _id: pagoId, clienteId });
    if (!pago) throw ApiError.notFound("Pago no encontrado");
    if (["paid", "refunded"].includes(pago.estado)) {
      throw ApiError.conflict("Este pago ya está cerrado");
    }

    const detectado = detectarTipoArchivo(archivo.buffer);
    const permitidos: string[] = [...TIPOS_IMAGEN, TIPOS_ARCHIVO.pdf];
    if (!detectado || !permitidos.includes(detectado.mimeType)) {
      throw ApiError.validation(
        "El comprobante debe ser una imagen JPG, PNG o WebP, o un PDF (verificado por contenido)",
      );
    }

    let buffer = archivo.buffer;
    let mimeType = detectado.mimeType;
    if (detectado.mimeType !== TIPOS_ARCHIVO.pdf) {
      const optimizado = await optimizarImagen(
        archivo.buffer,
        detectado.mimeType,
      );
      buffer = optimizado.buffer;
      mimeType = optimizado.mimeType;
    }

    const almacenado = await this.storage.upload({
      buffer,
      mimeType,
      folder: `pagos/${pagoId}/comprobantes`,
    });
    if (pago.comprobante?.publicId) {
      await this.storage.delete(pago.comprobante.publicId);
    }
    pago.comprobante = {
      url: almacenado.url,
      publicId: almacenado.publicId,
      nombre: archivo.nombre,
      subidoEn: new Date(),
    };
    if (referenciaCliente) pago.referenciaCliente = referenciaCliente;
    pago.estado = "en_revision";
    pago.motivoRechazo = "";
    await pago.save();

    try {
      const { notificacionService } = await import("./notificacion.service");
      await notificacionService.crearAdmins({
        tipo: "plataforma",
        titulo: "Comprobante por verificar",
        cuerpo: `${pago.descripcion} · $${pago.monto} ${pago.moneda} — ${pago.emailCliente}`,
        contexto: "compra",
        contextoId: pago._id,
        creadaPor: clienteId,
      });
    } catch (error) {
      logger.fracaso("PagoService.subirComprobante: notificación falló", {
        error: (error as Error).message,
      });
    }

    logger.exito("PagoService.subirComprobante completado", { pagoId });
    return toJson(pago.toObject());
  }

  /** Admin: confirma un pago (idempotente) y aplica sus efectos. */
  async confirmarPago(pagoId: string, adminId: string): Promise<PagoJson> {
    logger.proceso("PagoService.confirmarPago", { pagoId });
    const pago = await PagoModel.findById(pagoId);
    if (!pago) throw ApiError.notFound("Pago no encontrado");
    if (pago.estado === "paid") {
      logger.exito("PagoService.confirmarPago: ya confirmado (idempotente)", {
        pagoId,
      });
      return toJson(pago.toObject());
    }
    if (pago.estado === "refunded") {
      throw ApiError.conflict("El pago fue reembolsado");
    }

    pago.estado = "paid";
    pago.confirmadoPor = adminId as never;
    await pago.save();

    await this.aplicarPagoConfirmado(pago);
    await this.notificarPagoConfirmado(pago);

    logger.exito("PagoService.confirmarPago completado", { pagoId });
    return toJson(pago.toObject());
  }

  /** Admin: rechaza el comprobante y avisa al cliente el motivo. */
  async rechazarPago(
    pagoId: string,
    adminId: string,
    motivo: string,
  ): Promise<PagoJson> {
    logger.proceso("PagoService.rechazarPago", { pagoId });
    const pago = await PagoModel.findById(pagoId);
    if (!pago) throw ApiError.notFound("Pago no encontrado");
    if (pago.estado !== "en_revision") {
      throw ApiError.validation(
        "Solo se rechazan comprobantes que están en revisión",
      );
    }
    pago.estado = "rechazado";
    pago.motivoRechazo = motivo;
    pago.confirmadoPor = adminId as never;
    await pago.save();

    try {
      const usuario = pago.clienteId
        ? await UserModel.findById(pago.clienteId).lean()
        : null;
      if (usuario?.email) {
        await this.notificaciones.enviarPagoRechazado({
          email: usuario.email,
          cliente: usuario.nombre,
          concepto: pago.descripcion,
          motivo,
        });
      }
      const { notificacionService } = await import("./notificacion.service");
      await notificacionService.crearAdmins({
        tipo: "plataforma",
        titulo: "Pago rechazado",
        cuerpo: `${pago.descripcion} · ${motivo}`,
        contexto: "compra",
        contextoId: pago._id,
        creadaPor: adminId,
      });
    } catch (error) {
      logger.fracaso("PagoService.rechazarPago: notificación falló", {
        error: (error as Error).message,
      });
    }

    logger.exito("PagoService.rechazarPago completado", { pagoId });
    return toJson(pago.toObject());
  }

  /** Cliente: captura la orden de PayPal al volver del checkout. */
  async capturarPaypal(pagoId: string, clienteId: string): Promise<PagoJson> {
    logger.proceso("PagoService.capturarPaypal", { pagoId });
    const pago = await PagoModel.findOne({ _id: pagoId, clienteId });
    if (!pago) throw ApiError.notFound("Pago no encontrado");
    if (pago.estado === "paid") {
      return toJson(pago.toObject());
    }
    if (!pago.referencia) {
      throw ApiError.validation("El pago no tiene una orden de PayPal");
    }
    if (!this.provider.capture) {
      throw ApiError.badRequest(
        "La pasarela activa no soporta captura de pagos",
      );
    }

    const resultado = await this.provider.capture(pago.referencia);
    if (resultado.status === "paid") {
      // La referencia pasa a ser el id de captura (es lo que reembolsa PayPal).
      if (resultado.paymentId) pago.referencia = resultado.paymentId;
      pago.estado = "paid";
      await pago.save();
      await this.aplicarPagoConfirmado(pago);
      await this.notificarPagoConfirmado(pago);
    }

    logger.exito("PagoService.capturarPaypal completado", {
      pagoId,
      estado: resultado.status,
    });
    return toJson(pago.toObject());
  }

  /** Admin: pagos con comprobante pendientes de verificación. */
  async listarPorVerificar(): Promise<PagoJson[]> {
    logger.proceso("PagoService.listarPorVerificar");
    const docs = await PagoModel.find({ estado: "en_revision" })
      .sort({ updatedAt: 1 })
      .lean();
    logger.exito("PagoService.listarPorVerificar completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  /** Obtiene un pago del cliente (o cualquiera si es admin). */
  async obtenerPago(
    pagoId: string,
    userId: string,
    rol: "admin" | "cliente",
  ): Promise<PagoJson> {
    logger.proceso("PagoService.obtenerPago", { pagoId });
    const pago =
      rol === "admin"
        ? await PagoModel.findById(pagoId).lean()
        : await PagoModel.findOne({ _id: pagoId, clienteId: userId }).lean();
    if (!pago) throw ApiError.notFound("Pago no encontrado");
    logger.exito("PagoService.obtenerPago completado", { pagoId });
    return toJson(pago);
  }

  /** Aplica los efectos del pago confirmado según su tipo. */
  private async aplicarPagoConfirmado(pago: Pago & { _id: unknown }): Promise<{
    estado: "paid";
    onboarding?: { usuario?: string; proyecto?: string };
  }> {
    if (pago.tipoProducto === "funcionalidad") {
      await this.marcarSolicitudPagada(pago);
      const onboarding: { usuario?: string } = {};
      if (pago.clienteId) onboarding.usuario = String(pago.clienteId);
      return { estado: "paid", onboarding };
    }

    if (pago.proyectoId) {
      const proyectoId = String(pago.proyectoId);
      if (pago.etapaId) {
        await proyectoService.marcarEtapaPagada(
          proyectoId,
          pago.etapaId,
          pago._id as never,
        );
      }
      await proyectoService.iniciarDesdePago(proyectoId, pago._id as never);
      const onboarding: { usuario?: string; proyecto?: string } = {
        proyecto: proyectoId,
      };
      if (pago.clienteId) onboarding.usuario = String(pago.clienteId);
      return { estado: "paid", onboarding };
    }

    if (pago.espacioId) {
      const espacioId = String(pago.espacioId);
      if (pago.etapaId) {
        await espacioService.marcarEtapaPagada(
          espacioId,
          pago.etapaId,
          pago._id as never,
        );
      }
      await espacioService.activarDesdePago(
        espacioId,
        pago._id as never,
        pago.tipoPago === "sesiones" ? pago.cantidad : undefined,
      );
      const onboarding: { usuario?: string } = {};
      if (pago.clienteId) onboarding.usuario = String(pago.clienteId);
      return { estado: "paid", onboarding };
    }

    // Pagos de catálogo sin entorno previo (flujo legado del webhook).
    return this.ejecutarOnboarding(pago);
  }

  /** Correo + campana de pago confirmado. */
  private async notificarPagoConfirmado(
    pago: Pago & { _id: unknown },
  ): Promise<void> {
    try {
      const usuario = pago.clienteId
        ? await UserModel.findById(pago.clienteId).lean()
        : null;
      if (usuario?.email) {
        await this.notificaciones.enviarPagoConfirmado({
          email: usuario.email,
          cliente: usuario.nombre,
          concepto: pago.descripcion,
          monto: pago.monto,
          moneda: pago.moneda,
        });
      }
      const { notificacionService } = await import("./notificacion.service");
      await notificacionService.crearAdmins({
        tipo: "plataforma",
        titulo: "Pago confirmado",
        cuerpo: `${pago.descripcion} · $${pago.monto} ${pago.moneda}`,
        contexto: "compra",
        contextoId: pago._id,
      });
    } catch (error) {
      logger.fracaso("PagoService.notificarPagoConfirmado falló", {
        error: (error as Error).message,
      });
    }
  }

  /** Código corto único para el mensaje de la transacción (ej. DJ-4F7K2). */
  private async generarCodigo(): Promise<string> {
    const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let intento = 0; intento < 5; intento += 1) {
      let codigo = "DJ-";
      for (let i = 0; i < 5; i += 1) {
        codigo += alfabeto[randomInt(alfabeto.length)];
      }
      const existe = await PagoModel.exists({ codigo });
      if (!existe) return codigo;
    }
    throw ApiError.internal("No se pudo generar el código del pago");
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

    let pago = await PagoModel.findOne({ referencia: evento.paymentId });
    if (!pago && evento.externalReference) {
      // MercadoPago envía el id del PAGO (no la preferencia); su
      // external_reference contiene NUESTRO pagoId → lo resolvemos aquí.
      pago = await PagoModel.findOne({ _id: evento.externalReference });
      if (pago) {
        pago.referencia = evento.paymentId;
        await pago.save();
      }
    }
    if (!pago) {
      // Respondemos ok igual (no dejar que ePayco reintente infinitamente),
      // pero registramos el fracaso para auditoría.
      logger.fracaso("PagoService.procesarWebhook: pago no encontrado", {
        referencia: evento.paymentId,
        externalReference: evento.externalReference,
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
      return this.aplicarPagoConfirmado(pago);
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
  ): Promise<Date | null> {
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
    return proyecto.fechaEntrega ?? null;
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
