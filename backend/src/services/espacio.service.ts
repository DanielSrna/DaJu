import { EspacioModel } from "../models/espacio.model";
import { Types } from "mongoose";
import { Etapa, resumenEtapas } from "../models/etapa.schema";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

interface EspacioJson {
  id: string;
  clienteId: string;
  tipoProducto: "plantilla" | "servicio";
  productoId: string;
  productoSlug: string;
  pagoId: string;
  estado: "planeacion" | "activo" | "completado";
  precioBase: number;
  moneda: string;
  etapas: Etapa[];
  etapasCompletadas: number;
  etapasTotal: number;
  montoPagado: number;
  montoTotal: number;
  sesiones: { total: number; usadas: number };
  createdAt: Date;
}

function toJson(doc: Record<string, unknown>): EspacioJson {
  const s = (doc.sesiones as { total: number; usadas: number }) ?? {
    total: 1,
    usadas: 0,
  };
  const etapas = (doc.etapas as Etapa[]) ?? [];
  return {
    id: String(doc._id),
    clienteId: String(doc.clienteId),
    tipoProducto: doc.tipoProducto as EspacioJson["tipoProducto"],
    productoId: String(doc.productoId),
    productoSlug: String(doc.productoSlug ?? ""),
    pagoId: doc.pagoId ? String(doc.pagoId) : "",
    estado: (doc.estado as EspacioJson["estado"]) ?? "activo",
    precioBase: Number(doc.precioBase ?? 0),
    moneda: String(doc.moneda ?? "USD"),
    etapas,
    ...resumenEtapas(etapas),
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

  /** Marca una etapa del plan como pagada y la desbloquea (idempotente). */
  async marcarEtapaPagada(
    espacioId: string,
    etapaId: string,
    pagoId: Types.ObjectId,
  ): Promise<void> {
    logger.proceso("EspacioService.marcarEtapaPagada", {
      espacioId,
      etapaId,
    });
    const espacio = await EspacioModel.findById(espacioId);
    if (!espacio) throw ApiError.notFound("Espacio no encontrado");
    const etapas = espacio.etapas as unknown as Array<{
      _id: unknown;
      estado: string;
      pagoEstado: string;
      pagoId?: Types.ObjectId | null;
    }>;
    const etapa = etapas.find((e) => String(e._id) === etapaId);
    if (!etapa) throw ApiError.notFound("Etapa no encontrada");
    etapa.pagoEstado = "pagado";
    etapa.pagoId = pagoId;
    if (etapa.estado === "bloqueada") etapa.estado = "en_curso";
    espacio.markModified("etapas");
    await espacio.save();
    logger.exito("EspacioService.marcarEtapaPagada completado", {
      espacioId,
      etapaId,
    });
  }

  /**
   * Activa el espacio con el primer pago confirmado (idempotente):
   * deja de estar en planeación y carga las sesiones compradas.
   */
  async activarDesdePago(
    espacioId: string,
    pagoId: Types.ObjectId,
    sesionesTotal?: number,
  ): Promise<void> {
    logger.proceso("EspacioService.activarDesdePago", { espacioId });
    const espacio = await EspacioModel.findById(espacioId);
    if (!espacio) throw ApiError.notFound("Espacio no encontrado");
    if (!espacio.pagoId) espacio.set("pagoId", pagoId);
    if (espacio.estado === "planeacion") espacio.estado = "activo";
    if (sesionesTotal && sesionesTotal > 0) {
      espacio.sesiones = {
        total: sesionesTotal,
        usadas: espacio.sesiones?.usadas ?? 0,
      };
    }
    await espacio.save();
    logger.exito("EspacioService.activarDesdePago completado", { espacioId });
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
