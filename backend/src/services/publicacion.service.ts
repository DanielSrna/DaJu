import { PublicacionModel, Publicacion } from "../models/publicacion.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

type PublicacionInput = Omit<Publicacion, "slug"> & { slug?: string };

/** Respuesta pública: sin fechas, sin campos internos. */
interface PublicacionJson {
  id: string;
  titulo: string;
  slug: string;
  tipo: "concepto" | "noticia";
  resumen: string;
  contenido: string;
  secciones: string[];
}

function toJson(doc: Record<string, unknown>): PublicacionJson {
  return {
    id: String(doc._id),
    titulo: String(doc.titulo),
    slug: String(doc.slug),
    tipo: String(doc.tipo) as PublicacionJson["tipo"],
    resumen: String(doc.resumen),
    contenido: String(doc.contenido),
    secciones: (doc.secciones as string[]) ?? [],
  };
}

function slugDe(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export class PublicacionService {
  /** Blog público: solo publicadas, filtros por tipo y sección. */
  async listarPublicas(filtros: {
    tipo?: string;
    seccion?: string;
    pagina: number;
    limite: number;
  }): Promise<{ publicaciones: PublicacionJson[]; total: number }> {
    logger.proceso("PublicacionService.listarPublicas", { filtros });

    const query: Record<string, unknown> = { publicado: true };
    if (filtros.tipo) query.tipo = filtros.tipo;
    if (filtros.seccion) query.secciones = filtros.seccion;

    const limite = Math.min(Math.max(filtros.limite, 1), 100);
    const pagina = Math.max(filtros.pagina, 1);

    const [docs, total] = await Promise.all([
      PublicacionModel.find(query)
        .sort({ createdAt: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .lean(),
      PublicacionModel.countDocuments(query),
    ]);

    return { publicaciones: docs.map((d) => toJson(d)), total };
  }

  async obtenerPorSlug(slug: string): Promise<PublicacionJson> {
    logger.proceso("PublicacionService.obtenerPorSlug", { slug });
    const doc = await PublicacionModel.findOne({
      slug,
      publicado: true,
    }).lean();
    if (!doc) {
      logger.fracaso("PublicacionService.obtenerPorSlug: no encontrada", {
        slug,
      });
      throw ApiError.notFound("Publicación no encontrada");
    }
    return toJson(doc);
  }

  async listarTodas(): Promise<PublicacionJson[]> {
    logger.proceso("PublicacionService.listarTodas");
    const docs = await PublicacionModel.find().sort({ createdAt: -1 }).lean();
    return docs.map((d) => toJson(d));
  }

  async crear(data: PublicacionInput): Promise<PublicacionJson> {
    logger.proceso("PublicacionService.crear", { titulo: data.titulo });

    const slug = data.slug?.trim() || slugDe(data.titulo);
    const duplicado = await PublicacionModel.exists({ slug });
    if (duplicado) {
      logger.fracaso("PublicacionService.crear: slug duplicado", { slug });
      throw ApiError.conflict(
        `Ya existe una publicación con el slug "${slug}"`,
      );
    }

    const doc = await PublicacionModel.create({
      ...data,
      slug,
      secciones: data.secciones ?? [],
      publicado: data.publicado ?? false,
    });
    logger.exito("PublicacionService.crear completado", {
      id: String(doc._id),
    });
    return toJson(doc.toObject());
  }

  async actualizar(
    id: string,
    data: Partial<PublicacionInput>,
  ): Promise<PublicacionJson> {
    logger.proceso("PublicacionService.actualizar", { id });

    const doc = await PublicacionModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      logger.fracaso("PublicacionService.actualizar: no encontrada", { id });
      throw ApiError.notFound("Publicación no encontrada");
    }
    logger.exito("PublicacionService.actualizar completado", { id });
    return toJson(doc.toObject());
  }

  async eliminar(id: string): Promise<void> {
    logger.proceso("PublicacionService.eliminar", { id });
    const doc = await PublicacionModel.findByIdAndDelete(id);
    if (!doc) {
      logger.fracaso("PublicacionService.eliminar: no encontrada", { id });
      throw ApiError.notFound("Publicación no encontrada");
    }
    logger.exito("PublicacionService.eliminar completado", { id });
  }
}

export const publicacionService = new PublicacionService();
