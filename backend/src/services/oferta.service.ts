import { OfertaModel } from "../models/oferta.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

type TipoOferta = "plantilla" | "consultoria";

interface OfertaInput {
  tipo: TipoOferta;
  nombre: string;
  descripcion: string;
  features?: string[];
  desde?: number | null;
  para?: string;
  activo?: boolean;
  orden?: number;
}

function toJson(doc: Record<string, unknown>) {
  return {
    id: String(doc._id),
    tipo: doc.tipo,
    nombre: doc.nombre,
    descripcion: doc.descripcion,
    features: doc.features ?? [],
    desde: doc.desde ?? null,
    para: doc.para ?? "",
    activo: doc.activo ?? true,
    orden: doc.orden ?? 0,
  };
}

export class OfertaService {
  /** Vitrina pública: solo ofertas activas, ordenadas manualmente. */
  async listarActivas() {
    logger.proceso("OfertaService.listarActivas");
    const docs = await OfertaModel.find({ activo: true })
      .sort({ orden: 1, createdAt: -1 })
      .lean();
    logger.exito("OfertaService.listarActivas completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  /** Admin: todas (incluye inactivas). */
  async listarTodas() {
    logger.proceso("OfertaService.listarTodas");
    const docs = await OfertaModel.find()
      .sort({ orden: 1, createdAt: -1 })
      .lean();
    logger.exito("OfertaService.listarTodas completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  async crear(data: OfertaInput) {
    logger.proceso("OfertaService.crear", {
      tipo: data.tipo,
      nombre: data.nombre,
    });
    const doc = await OfertaModel.create({
      ...data,
      features: data.features ?? [],
      desde: data.desde ?? null,
      para: data.para ?? "",
    });
    logger.exito("OfertaService.crear completado", { id: String(doc._id) });
    return toJson(doc.toObject());
  }

  async actualizar(id: string, data: Partial<OfertaInput>) {
    logger.proceso("OfertaService.actualizar", { id });
    const doc = await OfertaModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      logger.fracaso("OfertaService.actualizar: no encontrado", { id });
      throw ApiError.notFound("Oferta no encontrada");
    }
    logger.exito("OfertaService.actualizar completado", { id });
    return toJson(doc.toObject());
  }

  async eliminar(id: string): Promise<void> {
    logger.proceso("OfertaService.eliminar", { id });
    const doc = await OfertaModel.findByIdAndDelete(id);
    if (!doc) {
      logger.fracaso("OfertaService.eliminar: no encontrado", { id });
      throw ApiError.notFound("Oferta no encontrada");
    }
    logger.exito("OfertaService.eliminar completado", { id });
  }
}

export const ofertaService = new OfertaService();
