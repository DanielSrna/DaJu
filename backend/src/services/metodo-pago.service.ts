import { MetodoPagoModel } from "../models/metodo-pago.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

type TipoMetodo = "manual" | "paypal";
type MonedaMetodo = "COP" | "USD";

interface MetodoPagoInput {
  nombre: string;
  tipo?: TipoMetodo;
  moneda?: MonedaMetodo;
  titular?: string;
  datos?: string;
  instrucciones?: string;
  qrUrl?: string;
  activo?: boolean;
  orden?: number;
}

export interface MetodoPagoJson {
  id: string;
  nombre: string;
  clave: string;
  tipo: TipoMetodo;
  moneda: MonedaMetodo;
  titular: string;
  datos: string;
  instrucciones: string;
  qrUrl: string;
  activo: boolean;
  orden: number;
}

function toJson(doc: Record<string, unknown>): MetodoPagoJson {
  return {
    id: String(doc._id),
    nombre: String(doc.nombre),
    clave: String(doc.clave),
    tipo: (doc.tipo as TipoMetodo) ?? "manual",
    moneda: (doc.moneda as MonedaMetodo) ?? "COP",
    titular: String(doc.titular ?? ""),
    datos: String(doc.datos ?? ""),
    instrucciones: String(doc.instrucciones ?? ""),
    qrUrl: String(doc.qrUrl ?? ""),
    activo: Boolean(doc.activo),
    orden: Number(doc.orden ?? 0),
  };
}

/** Catálogo de métodos de pago configurable desde el panel admin. */
export class MetodoPagoService {
  /** Público: solo activos, ordenados manualmente. */
  async listarActivos(): Promise<MetodoPagoJson[]> {
    logger.proceso("MetodoPagoService.listarActivos");
    const docs = await MetodoPagoModel.find({ activo: true })
      .sort({ orden: 1, createdAt: 1 })
      .lean();
    logger.exito("MetodoPagoService.listarActivos completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  /** Admin: todos (incluye inactivos). */
  async listarTodos(): Promise<MetodoPagoJson[]> {
    logger.proceso("MetodoPagoService.listarTodos");
    const docs = await MetodoPagoModel.find()
      .sort({ orden: 1, createdAt: 1 })
      .lean();
    logger.exito("MetodoPagoService.listarTodos completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  async obtenerPorClave(clave: string): Promise<MetodoPagoJson> {
    logger.proceso("MetodoPagoService.obtenerPorClave", { clave });
    const doc = await MetodoPagoModel.findOne({ clave, activo: true }).lean();
    if (!doc) throw ApiError.notFound("Método de pago no disponible");
    logger.exito("MetodoPagoService.obtenerPorClave completado", { clave });
    return toJson(doc);
  }

  async crear(data: MetodoPagoInput): Promise<MetodoPagoJson> {
    logger.proceso("MetodoPagoService.crear", { nombre: data.nombre });
    const clave = slugDe(data.nombre);
    const duplicado = await MetodoPagoModel.exists({ clave });
    if (duplicado) {
      throw ApiError.conflict(`Ya existe un método llamado "${data.nombre}"`);
    }
    const doc = await MetodoPagoModel.create({
      ...data,
      clave,
      tipo: data.tipo ?? "manual",
      moneda: data.moneda ?? "COP",
      titular: data.titular ?? "",
      datos: data.datos ?? "",
      instrucciones: data.instrucciones ?? "",
      qrUrl: data.qrUrl ?? "",
    });
    logger.exito("MetodoPagoService.crear completado", {
      id: String(doc._id),
    });
    return toJson(doc.toObject());
  }

  async actualizar(
    id: string,
    data: Partial<MetodoPagoInput>,
  ): Promise<MetodoPagoJson> {
    logger.proceso("MetodoPagoService.actualizar", { id });
    const doc = await MetodoPagoModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      logger.fracaso("MetodoPagoService.actualizar: no encontrado", { id });
      throw ApiError.notFound("Método de pago no encontrado");
    }
    logger.exito("MetodoPagoService.actualizar completado", { id });
    return toJson(doc.toObject());
  }

  async eliminar(id: string): Promise<void> {
    logger.proceso("MetodoPagoService.eliminar", { id });
    const doc = await MetodoPagoModel.findByIdAndDelete(id);
    if (!doc) {
      logger.fracaso("MetodoPagoService.eliminar: no encontrado", { id });
      throw ApiError.notFound("Método de pago no encontrado");
    }
    logger.exito("MetodoPagoService.eliminar completado", { id });
  }
}

function slugDe(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const metodoPagoService = new MetodoPagoService();
