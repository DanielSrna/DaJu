import { ProyectoModel, Proyecto } from "../models/proyecto.model";
import { PaqueteModel } from "../models/paquete.model";
import { UserModel } from "../models/user.model";
import { PagoModel } from "../models/pago.model";
import { addBusinessDays } from "../utils/fechas";
import { ApiError } from "../utils/ApiError";
import { capacidadService } from "./capacidad.service";
import {
  NotificacionesService,
  notificacionesService,
} from "./notificaciones.service";
import { logger } from "../config/logger";

/** Datos mínimos del pago que necesita el proyecto (desacoplado de Mongoose). */
export interface CompraPago {
  _id: unknown;
  paqueteId: unknown;
  paqueteSlug: string;
}

const SIGUIENTE_ESTADO: Record<string, string> = {
  recibido: "diseno",
  diseno: "desarrollo",
  desarrollo: "entregado",
};

interface FiltrosAdmin {
  estado?: string;
  email?: string;
  pagoEstado?: string;
  pagina: number;
  limite: number;
}

interface ProyectoJson {
  id: string;
  cliente: { id: string; email: string; nombre: string };
  paquete: Proyecto["paquete"];
  estado: Proyecto["estado"];
  fechaCompra: Date;
  fechaEntrega: Date;
  fechaEntregado: Date | null;
  createdAt: Date;
}

/**
 * Unidad de trabajo creada tras el pago de un paquete.
 * Monitor: recibido -> diseno -> desarrollo -> entregado.
 * Entrega: fecha de compra congelada + días hábiles efectivos (gestor de capacidad).
 */
export class ProyectoService {
  constructor(
    private readonly notificaciones: NotificacionesService = notificacionesService,
  ) {}
  async crearDesdeCompra(
    pago: CompraPago,
    clienteId: string,
  ): Promise<Proyecto & { _id: unknown }> {
    logger.proceso("ProyectoService.crearDesdeCompra", {
      pagoId: String(pago._id),
    });

    const existente = await ProyectoModel.findOne({ pagoId: pago._id });
    if (existente) {
      logger.exito(
        "ProyectoService.crearDesdeCompra: ya existía (idempotente)",
        {
          proyectoId: String(existente._id),
        },
      );
      return existente.toObject() as unknown as Proyecto & { _id: unknown };
    }

    const paquete = await PaqueteModel.findById(pago.paqueteId).lean();
    if (!paquete) {
      logger.fracaso(
        "ProyectoService.crearDesdeCompra: paquete del pago no existe",
        {
          paqueteId: String(pago.paqueteId),
        },
      );
      throw new Error(
        `Paquete ${pago.paqueteSlug} no encontrado para el proyecto`,
      );
    }

    const diasEfectivos = await capacidadService.getDiasEfectivos(
      paquete.tipo,
      paquete.diasEntrega,
    );
    const fechaCompra = new Date();
    const fechaEntrega = addBusinessDays(fechaCompra, diasEfectivos);

    const doc = await ProyectoModel.create({
      clienteId,
      pagoId: pago._id,
      paquete: {
        slug: paquete.slug,
        nombre: paquete.nombre,
        tipo: paquete.tipo,
        vistasIncluidas: paquete.vistasIncluidas,
        soporteMeses: paquete.soporteMeses,
        diasEntrega: paquete.diasEntrega,
      },
      estado: "recibido",
      fechaCompra,
      fechaEntrega,
    });

    logger.exito("ProyectoService.crearDesdeCompra completado", {
      proyectoId: String(doc._id),
      fechaEntrega: fechaEntrega.toISOString(),
      diasEfectivos,
    });
    return doc.toObject() as unknown as Proyecto & { _id: unknown };
  }

  async listarMios(clienteId: string): Promise<ProyectoJson[]> {
    logger.proceso("ProyectoService.listarMios", { clienteId });
    const docs = await ProyectoModel.find({ clienteId })
      .sort({ createdAt: -1 })
      .populate("clienteId", "email nombre")
      .lean();
    return docs.map((d) => toJson(d));
  }

  async listarTodos(filtros: FiltrosAdmin): Promise<{
    proyectos: ProyectoJson[];
    total: number;
    pagina: number;
    totalPaginas: number;
  }> {
    logger.proceso("ProyectoService.listarTodos", { filtros });

    const query: Record<string, unknown> = {};
    if (filtros.estado) query.estado = filtros.estado;

    if (filtros.email) {
      const usuarios = await UserModel.find({
        email: { $regex: filtros.email, $options: "i" },
      }).select("_id");
      query.clienteId = { $in: usuarios.map((u) => u._id) };
    }

    if (filtros.pagoEstado) {
      const pagos = await PagoModel.find({ estado: filtros.pagoEstado }).select(
        "_id",
      );
      query.pagoId = { $in: pagos.map((p) => p._id) };
    }

    const limite = Math.min(Math.max(filtros.limite, 1), 100);
    const pagina = Math.max(filtros.pagina, 1);

    const [docs, total] = await Promise.all([
      ProyectoModel.find(query)
        .sort({ createdAt: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .populate("clienteId", "email nombre")
        .lean(),
      ProyectoModel.countDocuments(query),
    ]);

    logger.exito("ProyectoService.listarTodos completado", { total });
    return {
      proyectos: docs.map((d) => toJson(d)),
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async obtener(
    id: string,
    rol: "admin" | "cliente",
    clienteId: string,
  ): Promise<ProyectoJson> {
    logger.proceso("ProyectoService.obtener", { id });

    const doc = await ProyectoModel.findById(id)
      .populate("clienteId", "email nombre")
      .lean();
    if (!doc) {
      logger.fracaso("ProyectoService.obtener: no encontrado", { id });
      throw ApiError.notFound("Proyecto no encontrado");
    }
    if (
      rol === "cliente" &&
      String(
        (doc.clienteId as { _id?: unknown } | null | undefined)?._id ??
          doc.clienteId,
      ) !== clienteId
    ) {
      logger.fracaso("ProyectoService.obtener: cliente ajeno", {
        id,
        clienteId,
      });
      throw ApiError.forbidden("No tienes acceso a este proyecto");
    }
    return toJson(doc as Record<string, unknown>);
  }

  async cambiarEstado(
    id: string,
    nuevoEstado: string,
    rol: "admin" | "cliente",
    clienteId: string,
  ): Promise<ProyectoJson> {
    logger.proceso("ProyectoService.cambiarEstado", { id, nuevoEstado });

    const doc = await ProyectoModel.findById(id).populate(
      "clienteId",
      "email nombre",
    );
    if (!doc) {
      logger.fracaso("ProyectoService.cambiarEstado: no encontrado", { id });
      throw ApiError.notFound("Proyecto no encontrado");
    }
    if (
      rol === "cliente" &&
      String(
        (doc.clienteId as { _id?: unknown } | null | undefined)?._id ??
          doc.clienteId,
      ) !== clienteId
    ) {
      logger.fracaso("ProyectoService.cambiarEstado: cliente ajeno", { id });
      throw ApiError.forbidden("No tienes acceso a este proyecto");
    }

    const estados = ["recibido", "diseno", "desarrollo", "entregado"];
    if (!estados.includes(nuevoEstado)) {
      throw ApiError.validation(`Estado inválido: ${nuevoEstado}`);
    }

    const esperado = SIGUIENTE_ESTADO[doc.estado];
    if (esperado !== nuevoEstado) {
      logger.fracaso("ProyectoService.cambiarEstado: transición inválida", {
        id,
        actual: doc.estado,
        solicitado: nuevoEstado,
      });
      throw ApiError.validation(
        `Transición inválida: de "${doc.estado}" solo se puede pasar a "${esperado}"`,
      );
    }

    doc.estado = nuevoEstado as Proyecto["estado"];
    if (nuevoEstado === "entregado") {
      // Inicia la garantía: el conteo de soporte arranca aquí.
      doc.fechaEntregado = new Date();
    }
    await doc.save();

    // Gatillo de notificaciones: avisa al cliente del avance (Fase 6).
    const clienteInfo = doc.clienteId as {
      _id?: unknown;
      email?: string;
      nombre?: string;
    };
    const clienteEmail = clienteInfo?.email;
    const clienteNombre = clienteInfo?.nombre ?? "cliente";
    const paqueteSnapshot = doc.paquete;
    if (clienteEmail && paqueteSnapshot) {
      if (nuevoEstado === "entregado" && doc.fechaEntregado) {
        const garantia = this.calcularGarantia(
          doc.fechaEntregado,
          paqueteSnapshot.soporteMeses,
        );
        await this.notificaciones.enviarEntrega({
          clienteEmail,
          clienteNombre,
          proyectoNombre: paqueteSnapshot.nombre,
          fechaExpiracionGarantia: garantia.fechaExpiracion,
        });
      } else {
        await this.notificaciones.enviarAvanceProyecto({
          clienteEmail,
          clienteNombre,
          proyectoNombre: paqueteSnapshot.nombre,
          estado: nuevoEstado,
          fechaEntrega: doc.fechaEntrega,
        });
      }
    }

    logger.exito("ProyectoService.cambiarEstado completado", {
      id,
      nuevoEstado,
    });
    return toJson(doc.toObject() as Record<string, unknown>);
  }

  /** Garantía: ventana de soporte que inicia al entregar (compra + soporteMeses). */
  obtenerGarantia(
    id: string,
    rol: "admin" | "cliente",
    clienteId: string,
  ): Promise<GarantiaInfo> {
    logger.proceso("ProyectoService.obtenerGarantia", { id });
    return this.obtener(id, rol, clienteId).then((proyecto) => {
      if (!proyecto.fechaEntregado) {
        throw ApiError.validation(
          "La garantía aún no inicia: el proyecto no ha sido entregado",
        );
      }
      const paquete = proyecto.paquete as
        Proyecto["paquete"] | null | undefined;
      if (!paquete) {
        throw ApiError.notFound("El proyecto no tiene información del paquete");
      }
      return this.calcularGarantia(
        proyecto.fechaEntregado,
        paquete.soporteMeses,
      );
    });
  }

  private calcularGarantia(
    fechaEntregado: Date,
    soporteMeses: number,
  ): GarantiaInfo {
    const fechaExpiracion = new Date(fechaEntregado);
    fechaExpiracion.setUTCMonth(fechaExpiracion.getUTCMonth() + soporteMeses);
    fechaExpiracion.setUTCHours(23, 59, 59, 999);

    const diasRestantes = Math.max(
      0,
      Math.ceil((fechaExpiracion.getTime() - Date.now()) / 86_400_000),
    );

    return {
      activa: diasRestantes > 0,
      soporteMeses,
      fechaInicio: fechaEntregado,
      fechaExpiracion,
      diasRestantes,
    };
  }
}

interface GarantiaInfo {
  activa: boolean;
  soporteMeses: number;
  fechaInicio: Date;
  fechaExpiracion: Date;
  diasRestantes: number;
}

function toJson(doc: Record<string, unknown>): ProyectoJson {
  const c = doc.clienteId as
    | { _id?: unknown; email?: string; nombre?: string }
    | string
    | null
    | undefined;
  const cliente =
    typeof c === "object" && c !== null
      ? {
          id: String(c._id ?? c),
          email: c.email ?? "",
          nombre: c.nombre ?? "",
        }
      : { id: String(c ?? ""), email: "", nombre: "" };

  const p = doc.paquete as Proyecto["paquete"] | null | undefined;
  const estado = doc.estado as Proyecto["estado"];

  return {
    id: String(doc._id),
    cliente,
    paquete: p ?? ({} as Proyecto["paquete"]),
    estado,
    fechaCompra: new Date(doc.fechaCompra as string),
    fechaEntrega: new Date(doc.fechaEntrega as string),
    fechaEntregado: doc.fechaEntregado
      ? new Date(doc.fechaEntregado as string)
      : null,
    createdAt: new Date(doc.createdAt as string),
  };
}

export const proyectoService = new ProyectoService();
