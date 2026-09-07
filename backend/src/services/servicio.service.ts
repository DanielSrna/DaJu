import { ServicioModel, Servicio } from "../models/servicio.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

type ServicioInput = Omit<Servicio, "incluye" | "activo" | "detalles"> & {
  incluye?: string[];
  activo?: boolean;
  detalles?: Array<{ titulo: string; texto: string }>;
};

export class ServicioService {
  async listarActivos(): Promise<ServicioJson[]> {
    logger.proceso("ServicioService.listarActivos");
    const docs = await ServicioModel.find({ activo: true })
      .sort({ precio: 1 })
      .lean();
    logger.exito("ServicioService.listarActivos completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  async obtenerPorSlug(slug: string): Promise<ServicioJson> {
    logger.proceso("ServicioService.obtenerPorSlug", { slug });
    const doc = await ServicioModel.findOne({ slug, activo: true }).lean();
    if (!doc) {
      logger.fracaso("ServicioService.obtenerPorSlug: no encontrado", { slug });
      throw ApiError.notFound("Servicio no encontrado");
    }
    return toJson(doc);
  }

  async listarTodos(): Promise<ServicioJson[]> {
    logger.proceso("ServicioService.listarTodos");
    const docs = await ServicioModel.find().sort({ precio: 1 }).lean();
    logger.exito("ServicioService.listarTodos completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  async crear(data: ServicioInput): Promise<ServicioJson> {
    logger.proceso("ServicioService.crear", { slug: data.slug });

    const duplicado = await ServicioModel.exists({ slug: data.slug });
    if (duplicado) {
      logger.fracaso("ServicioService.crear: slug duplicado", {
        slug: data.slug,
      });
      throw ApiError.conflict(
        `Ya existe un servicio con el slug "${data.slug}"`,
      );
    }

    const doc = await ServicioModel.create(data);
    logger.exito("ServicioService.crear completado", {
      slug: data.slug,
      id: String(doc._id),
    });
    return toJson(doc.toObject());
  }

  async actualizar(
    id: string,
    data: Partial<ServicioInput>,
  ): Promise<ServicioJson> {
    logger.proceso("ServicioService.actualizar", { id });

    const doc = await ServicioModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      logger.fracaso("ServicioService.actualizar: no encontrado", { id });
      throw ApiError.notFound("Servicio no encontrado");
    }
    logger.exito("ServicioService.actualizar completado", { id });
    return toJson(doc.toObject());
  }

  async eliminar(id: string): Promise<void> {
    logger.proceso("ServicioService.eliminar", { id });

    const doc = await ServicioModel.findByIdAndDelete(id);
    if (!doc) {
      logger.fracaso("ServicioService.eliminar: no encontrado", { id });
      throw ApiError.notFound("Servicio no encontrado");
    }
    logger.exito("ServicioService.eliminar completado", { id });
  }
}

interface ServicioJson {
  id: string;
  nombre: string;
  slug: string;
  categoria: "auditoria" | "asesoria" | "aceleracion";
  descripcion: string;
  precio: number;
  moneda: string;
  duracionMin: number;
  canal: "Meet" | "Zoom";
  incluye: string[];
  detalles: Array<{ titulo: string; texto: string }>;
  activo: boolean;
}

function toJson(doc: Record<string, unknown>): ServicioJson {
  return {
    id: String(doc._id),
    nombre: String(doc.nombre),
    slug: String(doc.slug),
    categoria: doc.categoria as ServicioJson["categoria"],
    descripcion: String(doc.descripcion),
    precio: Number(doc.precio),
    moneda: String(doc.moneda ?? "USD"),
    duracionMin: Number(doc.duracionMin ?? 60),
    canal: (doc.canal as ServicioJson["canal"]) ?? "Meet",
    incluye: (doc.incluye as string[]) ?? [],
    detalles: (doc.detalles as Array<{ titulo: string; texto: string }>) ?? [],
    activo: Boolean(doc.activo),
  };
}

export const servicioService = new ServicioService();
