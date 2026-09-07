import { PlantillaModel, Plantilla } from "../models/plantilla.model";
import { StorageProvider } from "../adapters/storage/storage-provider.interface";
import { createStorageProvider } from "../adapters/storage/storage-provider.factory";
import {
  detectarTipoArchivo,
  optimizarImagen,
  TIPOS_IMAGEN,
} from "../utils/archivos";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

type PlantillaInput = Omit<
  Plantilla,
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

export class PlantillaService {
  constructor(
    private readonly storage: StorageProvider = createStorageProvider(),
  ) {}

  async listarActivos(): Promise<PlantillaJson[]> {
    logger.proceso("PlantillaService.listarActivos");
    const docs = await PlantillaModel.find({ activo: true })
      .sort({ precio: 1 })
      .lean();
    logger.exito("PlantillaService.listarActivos completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  async obtenerPorSlug(slug: string): Promise<PlantillaJson> {
    logger.proceso("PlantillaService.obtenerPorSlug", { slug });
    const doc = await PlantillaModel.findOne({ slug, activo: true }).lean();
    if (!doc) {
      logger.fracaso("PlantillaService.obtenerPorSlug: no encontrada", {
        slug,
      });
      throw ApiError.notFound("Plantilla no encontrada");
    }
    return toJson(doc);
  }

  async listarTodas(): Promise<PlantillaJson[]> {
    logger.proceso("PlantillaService.listarTodas");
    const docs = await PlantillaModel.find().sort({ precio: 1 }).lean();
    logger.exito("PlantillaService.listarTodas completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  async crear(data: PlantillaInput): Promise<PlantillaJson> {
    logger.proceso("PlantillaService.crear", { slug: data.slug });

    const duplicado = await PlantillaModel.exists({ slug: data.slug });
    if (duplicado) {
      logger.fracaso("PlantillaService.crear: slug duplicado", {
        slug: data.slug,
      });
      throw ApiError.conflict(
        `Ya existe una plantilla con el slug "${data.slug}"`,
      );
    }

    const doc = await PlantillaModel.create(data);
    logger.exito("PlantillaService.crear completado", {
      slug: data.slug,
      id: String(doc._id),
    });
    return toJson(doc.toObject());
  }

  async actualizar(
    id: string,
    data: Partial<PlantillaInput>,
  ): Promise<PlantillaJson> {
    logger.proceso("PlantillaService.actualizar", { id });

    const doc = await PlantillaModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      logger.fracaso("PlantillaService.actualizar: no encontrada", { id });
      throw ApiError.notFound("Plantilla no encontrada");
    }
    logger.exito("PlantillaService.actualizar completado", { id });
    return toJson(doc.toObject());
  }

  async eliminar(id: string): Promise<void> {
    logger.proceso("PlantillaService.eliminar", { id });

    const doc = await PlantillaModel.findByIdAndDelete(id);
    if (!doc) {
      logger.fracaso("PlantillaService.eliminar: no encontrada", { id });
      throw ApiError.notFound("Plantilla no encontrada");
    }
    logger.exito("PlantillaService.eliminar completado", { id });
  }

  /** Sube la imagen de portada (solo imágenes JPG/PNG/WebP verificadas por contenido). */
  async subirImagenPrincipal(
    id: string,
    archivo: ArchivoImagen,
  ): Promise<PlantillaJson> {
    logger.proceso("PlantillaService.subirImagenPrincipal", { id });

    const plantilla = await PlantillaModel.findById(id);
    if (!plantilla) {
      logger.fracaso("PlantillaService.subirImagenPrincipal: no encontrada", {
        id,
      });
      throw ApiError.notFound("Plantilla no encontrada");
    }

    const almacenada = await this.subirImagenValidada(
      archivo,
      `plantillas/${id}`,
    );
    if (plantilla.imagen?.publicId) {
      await this.storage.delete(plantilla.imagen.publicId);
    }
    plantilla.imagen = {
      url: almacenada.url,
      publicId: almacenada.publicId,
    } as unknown as NonNullable<typeof plantilla.imagen>;
    await plantilla.save();

    logger.exito("PlantillaService.subirImagenPrincipal completado", { id });
    return toJson(plantilla.toObject());
  }

  async agregarImagenGaleria(
    id: string,
    archivo: ArchivoImagen,
  ): Promise<PlantillaJson> {
    logger.proceso("PlantillaService.agregarImagenGaleria", { id });

    const plantilla = await PlantillaModel.findById(id);
    if (!plantilla) {
      logger.fracaso("PlantillaService.agregarImagenGaleria: no encontrada", {
        id,
      });
      throw ApiError.notFound("Plantilla no encontrada");
    }

    const almacenada = await this.subirImagenValidada(
      archivo,
      `plantillas/${id}/galeria`,
    );
    plantilla.galeria = [
      ...((plantilla.galeria as Array<{ url: string; publicId: string }>) ??
        []),
      { url: almacenada.url, publicId: almacenada.publicId },
    ] as unknown as typeof plantilla.galeria;
    await plantilla.save();

    logger.exito("PlantillaService.agregarImagenGaleria completado", { id });
    return toJson(plantilla.toObject());
  }

  async eliminarImagenGaleria(
    id: string,
    imagenPublicId: string,
  ): Promise<PlantillaJson> {
    logger.proceso("PlantillaService.eliminarImagenGaleria", {
      id,
      imagenPublicId,
    });

    const plantilla = await PlantillaModel.findById(id);
    if (!plantilla) {
      logger.fracaso("PlantillaService.eliminarImagenGaleria: no encontrada", {
        id,
      });
      throw ApiError.notFound("Plantilla no encontrada");
    }

    const existe = (
      (plantilla.galeria as Array<{ publicId: string }>) ?? []
    ).some((img) => img.publicId === imagenPublicId);
    if (!existe) {
      logger.fracaso(
        "PlantillaService.eliminarImagenGaleria: imagen no está en la galería",
        { imagenPublicId },
      );
      throw ApiError.notFound(
        "La imagen no está en la galería de la plantilla",
      );
    }

    await this.storage.delete(imagenPublicId);
    plantilla.galeria = (
      (plantilla.galeria as Array<{ publicId: string }>) ?? []
    ).filter(
      (img) => img.publicId !== imagenPublicId,
    ) as unknown as typeof plantilla.galeria;
    await plantilla.save();

    logger.exito("PlantillaService.eliminarImagenGaleria completado", { id });
    return toJson(plantilla.toObject());
  }

  private async subirImagenValidada(
    archivo: ArchivoImagen,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    const detectado = detectarTipoArchivo(archivo.buffer);
    if (!detectado || !TIPOS_IMAGEN.includes(detectado.mimeType)) {
      logger.fracaso(
        "PlantillaService.subirImagenValidada: no es una imagen válida",
        { nombre: archivo.nombre },
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

interface PlantillaJson {
  id: string;
  nombre: string;
  slug: string;
  plataforma: string;
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

function toJson(doc: Record<string, unknown>): PlantillaJson {
  return {
    id: String(doc._id),
    nombre: String(doc.nombre),
    slug: String(doc.slug),
    plataforma: String(doc.plataforma),
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

export const plantillaService = new PlantillaService();
