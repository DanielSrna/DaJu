import { EspacioModel } from "../models/espacio.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

interface EspacioJson {
  id: string;
  clienteId: string;
  tipoProducto: "plantilla" | "servicio";
  productoId: string;
  productoSlug: string;
  pagoId: string;
  estado: "activo" | "completado";
  sesiones: { total: number; usadas: number };
  createdAt: Date;
}

function toJson(doc: Record<string, unknown>): EspacioJson {
  const s = (doc.sesiones as { total: number; usadas: number }) ?? {
    total: 1,
    usadas: 0,
  };
  return {
    id: String(doc._id),
    clienteId: String(doc.clienteId),
    tipoProducto: doc.tipoProducto as EspacioJson["tipoProducto"],
    productoId: String(doc.productoId),
    productoSlug: String(doc.productoSlug ?? ""),
    pagoId: String(doc.pagoId),
    estado: (doc.estado as EspacioJson["estado"]) ?? "activo",
    sesiones: { total: s.total ?? 1, usadas: s.usadas ?? 0 },
    createdAt: doc.createdAt as Date,
  };
}

export class EspacioService {
  /** Crea el espacio desde un pago confirmado (idempotente por pago). */
  async crearDesdePago(datos: {
    pagoId: string;
    clienteId: string;
    tipoProducto: "plantilla" | "servicio";
    productoId: string;
    productoSlug: string;
    sesionesTotal?: number;
  }): Promise<EspacioJson> {
    logger.proceso("EspacioService.crearDesdePago", {
      pagoId: datos.pagoId,
      tipoProducto: datos.tipoProducto,
    });

    const existente = await EspacioModel.findOne({ pagoId: datos.pagoId });
    if (existente) {
      logger.exito("EspacioService.crearDesdePago: ya existía (idempotente)", {
        pagoId: datos.pagoId,
        espacioId: String(existente._id),
      });
      return toJson(existente.toObject());
    }

    const doc = await EspacioModel.create({
      clienteId: datos.clienteId,
      tipoProducto: datos.tipoProducto,
      productoId: datos.productoId,
      productoSlug: datos.productoSlug,
      pagoId: datos.pagoId,
      estado: "activo",
      sesiones: {
        total: datos.sesionesTotal ?? 1,
        usadas: 0,
      },
    });

    logger.exito("EspacioService.crearDesdePago completado", {
      espacioId: String(doc._id),
    });
    return toJson(doc.toObject());
  }

  async obtenerPropio(id: string, clienteId: string): Promise<EspacioJson> {
    logger.proceso("EspacioService.obtenerPropio", { id });
    const doc = await EspacioModel.findOne({
      _id: id,
      clienteId,
    });
    if (!doc) {
      logger.fracaso("EspacioService.obtenerPropio: no encontrado", { id });
      throw ApiError.notFound("Espacio no encontrado");
    }
    return toJson(doc.toObject());
  }

  async listarMios(clienteId: string): Promise<EspacioJson[]> {
    logger.proceso("EspacioService.listarMios", { clienteId });
    const docs = await EspacioModel.find({ clienteId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toJson);
  }

  async obtenerPorIdAdmin(id: string): Promise<EspacioJson> {
    logger.proceso("EspacioService.obtenerPorIdAdmin", { id });
    const doc = await EspacioModel.findById(id);
    if (!doc) throw ApiError.notFound("Espacio no encontrado");
    return toJson(doc.toObject());
  }
}

export const espacioService = new EspacioService();
