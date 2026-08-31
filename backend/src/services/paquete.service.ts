import { PaqueteModel, Paquete } from "../models/paquete.model";
import { StorageProvider } from "../adapters/storage/storage-provider.interface";
import { createStorageProvider } from "../adapters/storage/storage-provider.factory";
import {
  detectarTipoArchivo,
  optimizarImagen,
  TIPOS_IMAGEN,
} from "../utils/archivos";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

type PaqueteInput = Omit<
  Paquete,
  "features" | "activo" | "imagen" | "galeria" | "detalles"
> & {
  features?: string[];
  activo?: boolean;
  detalles?: Array<{ titulo: string; texto: string }>;
};

export interface ArchivoImagen {
  buffer: Buffer;
  nombre: string;
}

export class PaqueteService {
  constructor(
    private readonly storage: StorageProvider = createStorageProvider(),
  ) {}

  async listarActivos(): Promise<PaqueteDocumentJson[]> {
    logger.proceso("PaqueteService.listarActivos");
    const docs = await PaqueteModel.find({ activo: true })
      .sort({ precio: 1 })
      .lean();
    logger.exito("PaqueteService.listarActivos completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  async obtenerPorSlug(slug: string): Promise<PaqueteDocumentJson> {
    logger.proceso("PaqueteService.obtenerPorSlug", { slug });
    const doc = await PaqueteModel.findOne({ slug, activo: true }).lean();
    if (!doc) {
      logger.fracaso("PaqueteService.obtenerPorSlug: no encontrado", { slug });
      throw ApiError.notFound("Paquete no encontrado");
    }
    return toJson(doc);
  }

  async listarTodos(): Promise<PaqueteDocumentJson[]> {
    logger.proceso("PaqueteService.listarTodos");
    const docs = await PaqueteModel.find().sort({ precio: 1 }).lean();
    logger.exito("PaqueteService.listarTodos completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  async crear(data: PaqueteInput): Promise<PaqueteDocumentJson> {
    logger.proceso("PaqueteService.crear", { slug: data.slug });

    const duplicado = await PaqueteModel.exists({ slug: data.slug });
    if (duplicado) {
      logger.fracaso("PaqueteService.crear: slug duplicado", {
        slug: data.slug,
      });
      throw ApiError.conflict(
        `Ya existe un paquete con el slug "${data.slug}"`,
      );
    }

    const doc = await PaqueteModel.create(data);
    logger.exito("PaqueteService.crear completado", {
      slug: data.slug,
      id: String(doc._id),
    });
    return toJson(doc.toObject());
  }

  async actualizar(
    id: string,
    data: Partial<PaqueteInput>,
  ): Promise<PaqueteDocumentJson> {
    logger.proceso("PaqueteService.actualizar", { id });

    const doc = await PaqueteModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      logger.fracaso("PaqueteService.actualizar: no encontrado", { id });
      throw ApiError.notFound("Paquete no encontrado");
    }
    logger.exito("PaqueteService.actualizar completado", { id });
    return toJson(doc.toObject());
  }

  async eliminar(id: string): Promise<void> {
    logger.proceso("PaqueteService.eliminar", { id });

    const doc = await PaqueteModel.findByIdAndDelete(id);
    if (!doc) {
      logger.fracaso("PaqueteService.eliminar: no encontrado", { id });
      throw ApiError.notFound("Paquete no encontrado");
    }
    logger.exito("PaqueteService.eliminar completado", { id });
  }

  /** Sube la imagen de portada (solo imágenes JPG/PNG/WebP verificadas por contenido). */
  async subirImagenPrincipal(
    id: string,
    archivo: ArchivoImagen,
  ): Promise<PaqueteDocumentJson> {
    logger.proceso("PaqueteService.subirImagenPrincipal", { id });

    const paquete = await PaqueteModel.findById(id);
    if (!paquete) {
      logger.fracaso("PaqueteService.subirImagenPrincipal: no encontrado", {
        id,
      });
      throw ApiError.notFound("Paquete no encontrado");
    }

    const almacenada = await this.subirImagenValidada(
      archivo,
      `paquetes/${id}`,
    );

    if (paquete.imagen?.publicId) {
      await this.storage.delete(paquete.imagen.publicId);
    }
    paquete.imagen = {
      url: almacenada.url,
      publicId: almacenada.publicId,
    } as unknown as NonNullable<typeof paquete.imagen>;
    await paquete.save();

    logger.exito("PaqueteService.subirImagenPrincipal completado", { id });
    return toJson(paquete.toObject());
  }

  async agregarImagenGaleria(
    id: string,
    archivo: ArchivoImagen,
  ): Promise<PaqueteDocumentJson> {
    logger.proceso("PaqueteService.agregarImagenGaleria", { id });

    const paquete = await PaqueteModel.findById(id);
    if (!paquete) {
      logger.fracaso("PaqueteService.agregarImagenGaleria: no encontrado", {
        id,
      });
      throw ApiError.notFound("Paquete no encontrado");
    }

    const almacenada = await this.subirImagenValidada(
      archivo,
      `paquetes/${id}/galeria`,
    );
    paquete.galeria = [
      ...((paquete.galeria as Array<{ url: string; publicId: string }>) ?? []),
      { url: almacenada.url, publicId: almacenada.publicId },
    ] as unknown as typeof paquete.galeria;
    await paquete.save();

    logger.exito("PaqueteService.agregarImagenGaleria completado", { id });
    return toJson(paquete.toObject());
  }

  async eliminarImagenGaleria(
    id: string,
    imagenPublicId: string,
  ): Promise<PaqueteDocumentJson> {
    logger.proceso("PaqueteService.eliminarImagenGaleria", {
      id,
      imagenPublicId,
    });

    const paquete = await PaqueteModel.findById(id);
    if (!paquete) {
      logger.fracaso("PaqueteService.eliminarImagenGaleria: no encontrado", {
        id,
      });
      throw ApiError.notFound("Paquete no encontrado");
    }

    const existe = (
      (paquete.galeria as Array<{ publicId: string }>) ?? []
    ).some((img) => img.publicId === imagenPublicId);
    if (!existe) {
      logger.fracaso(
        "PaqueteService.eliminarImagenGaleria: imagen no está en la galería",
        {
          imagenPublicId,
        },
      );
      throw ApiError.notFound("La imagen no está en la galería del paquete");
    }

    await this.storage.delete(imagenPublicId);
    paquete.galeria = (
      (paquete.galeria as Array<{ publicId: string }>) ?? []
    ).filter(
      (img) => img.publicId !== imagenPublicId,
    ) as unknown as typeof paquete.galeria;
    await paquete.save();

    logger.exito("PaqueteService.eliminarImagenGaleria completado", { id });
    return toJson(paquete.toObject());
  }

  private async subirImagenValidada(
    archivo: ArchivoImagen,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    const detectado = detectarTipoArchivo(archivo.buffer);
    if (!detectado || !TIPOS_IMAGEN.includes(detectado.mimeType)) {
      logger.fracaso(
        "PaqueteService.subirImagenValidada: no es una imagen válida",
        {
          nombre: archivo.nombre,
        },
      );
      throw ApiError.validation(
        "El archivo debe ser una imagen JPG, PNG o WebP (verificado por contenido)",
      );
    }

    const optimizado = await optimizarImagen(
      archivo.buffer,
      detectado.mimeType,
    );
    const almacenada = await this.storage.upload({
      buffer: optimizado.buffer,
      mimeType: optimizado.mimeType,
      folder,
    });
    return { url: almacenada.url, publicId: almacenada.publicId };
  }
}

interface PaqueteDocumentJson {
  id: string;
  nombre: string;
  slug: string;
  tipo: string;
  descripcion: string;
  precio: number;
  moneda: string;
  vistasIncluidas: number;
  soporteMeses: number;
  diasEntrega: number;
  features: string[];
  imagen: { url: string; publicId: string } | null;
  galeria: Array<{ url: string; publicId: string }>;
  detalles: Array<{ titulo: string; texto: string }>;
  activo: boolean;
}

function toJson(doc: Record<string, unknown>): PaqueteDocumentJson {
  return {
    id: String(doc._id),
    nombre: String(doc.nombre),
    slug: String(doc.slug),
    tipo: String(doc.tipo),
    descripcion: String(doc.descripcion),
    precio: Number(doc.precio),
    moneda: String(doc.moneda ?? "USD"),
    vistasIncluidas: Number(doc.vistasIncluidas),
    soporteMeses: Number(doc.soporteMeses),
    diasEntrega: Number(doc.diasEntrega),
    features: (doc.features as string[]) ?? [],
    imagen: (doc.imagen as { url: string; publicId: string } | null) ?? null,
    galeria: (doc.galeria as Array<{ url: string; publicId: string }>) ?? [],
    detalles: (doc.detalles as Array<{ titulo: string; texto: string }>) ?? [],
    activo: Boolean(doc.activo),
  };
}

export const paqueteService = new PaqueteService();
