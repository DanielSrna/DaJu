import { CmsConfigModel } from "../models/cms-config.model";
import { CarruselItemModel } from "../models/carrusel-item.model";
import { StorageProvider } from "../adapters/storage/storage-provider.interface";
import { createStorageProvider } from "../adapters/storage/storage-provider.factory";
import {
  detectarTipoArchivo,
  optimizarImagen,
  TIPOS_IMAGEN,
} from "../utils/archivos";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

interface Colores {
  primario: string;
  secundario: string;
  acento: string;
}

interface CarruselJson {
  id: string;
  imagen: { url: string; publicId: string };
  link: string;
  titulo: string;
  activo: boolean;
  orden: number;
}

/**
 * Micro-CMS del panel: banners, logo, marquesina, carrusel e identidad visual.
 * GET /cms es público (lo consume la vitrina); las mutaciones son solo admin.
 */
export class CmsService {
  constructor(
    private readonly storage: StorageProvider = createStorageProvider(),
  ) {}

  /** Vista pública: logo, colores, marquesina y carrusel activo (ordenado). */
  async obtenerPublico() {
    logger.proceso("CmsService.obtenerPublico");
    const config = await this.getOrCreate();

    const carrusel = await CarruselItemModel.find({ activo: true })
      .sort({ orden: 1, createdAt: -1 })
      .lean();

    return {
      logo: config.logo ?? null,
      colores: config.colores,
      marquesina: config.marquesina,
      carrusel: carrusel.map(toCarruselJson),
    };
  }

  async actualizarIdentidad(data: {
    colores?: Partial<Colores>;
    logo?: { buffer: Buffer; nombre: string };
  }): Promise<CmsConfigPublic> {
    logger.proceso("CmsService.actualizarIdentidad");
    const config = await this.getOrCreate();

    if (data.colores) {
      config.colores = {
        primario:
          data.colores.primario ?? config.colores?.primario ?? "#000000",
        secundario:
          data.colores.secundario ?? config.colores?.secundario ?? "#ffffff",
        acento: data.colores.acento ?? config.colores?.acento ?? "#ffcc00",
      };
    }

    if (data.logo) {
      const almacenado = await this.subirImagenValidada(data.logo, "cms/logo");
      if (config.logo?.publicId) {
        await this.storage.delete(config.logo.publicId);
      }
      config.logo = { url: almacenado.url, publicId: almacenado.publicId };
    }

    await config.save();
    logger.exito("CmsService.actualizarIdentidad completado");
    return toPublico(config.toObject());
  }

  async actualizarMarquesina(data: { texto: string; activo: boolean }) {
    logger.proceso("CmsService.actualizarMarquesina");
    const config = await this.getOrCreate();
    config.marquesina = { texto: data.texto, activo: data.activo };
    await config.save();
    return { marquesina: config.marquesina };
  }

  async crearCarruselItem(data: {
    imagen: { buffer: Buffer; nombre: string };
    link?: string;
    titulo?: string;
    activo?: boolean;
    orden?: number;
  }): Promise<CarruselJson> {
    logger.proceso("CmsService.crearCarruselItem");
    const almacenado = await this.subirImagenValidada(
      data.imagen,
      "cms/carrusel",
    );

    const doc = await CarruselItemModel.create({
      imagen: { url: almacenado.url, publicId: almacenado.publicId },
      link: data.link ?? "",
      titulo: data.titulo ?? "",
      activo: data.activo ?? true,
      orden: data.orden ?? 0,
    });
    return toCarruselJson(doc.toObject());
  }

  async eliminarCarruselItem(id: string): Promise<void> {
    logger.proceso("CmsService.eliminarCarruselItem", { id });
    const doc = await CarruselItemModel.findByIdAndDelete(id);
    if (!doc) {
      logger.fracaso("CmsService.eliminarCarruselItem: no encontrado", { id });
      throw ApiError.notFound("Imagen de carrusel no encontrada");
    }
    const publicId = (doc.imagen as { publicId: string } | null | undefined)
      ?.publicId;
    if (publicId) {
      await this.storage.delete(publicId);
    }
    logger.exito("CmsService.eliminarCarruselItem completado", { id });
  }

  private async subirImagenValidada(
    archivo: { buffer: Buffer; nombre: string },
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    const detectado = detectarTipoArchivo(archivo.buffer);
    if (!detectado || !TIPOS_IMAGEN.includes(detectado.mimeType)) {
      logger.fracaso(
        "CmsService.subirImagenValidada: no es una imagen válida",
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

  private async getOrCreate() {
    return CmsConfigModel.findOneAndUpdate(
      {},
      {
        $setOnInsert: {
          logo: null,
          colores: {
            primario: "#000000",
            secundario: "#ffffff",
            acento: "#ffcc00",
          },
          marquesina: { texto: "", activo: false },
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }
}

interface CmsConfigPublic {
  logo: { url: string; publicId: string } | null;
  colores: { primario: string; secundario: string; acento: string };
  marquesina: { texto: string; activo: boolean };
}

function toPublico(doc: Record<string, unknown>): CmsConfigPublic {
  return {
    logo: (doc.logo as CmsConfigPublic["logo"]) ?? null,
    colores: (doc.colores as CmsConfigPublic["colores"]) ?? {
      primario: "#000000",
      secundario: "#ffffff",
      acento: "#ffcc00",
    },
    marquesina: (doc.marquesina as CmsConfigPublic["marquesina"]) ?? {
      texto: "",
      activo: false,
    },
  };
}

function toCarruselJson(doc: Record<string, unknown>): CarruselJson {
  return {
    id: String(doc._id),
    imagen: doc.imagen as CarruselJson["imagen"],
    link: String(doc.link ?? ""),
    titulo: String(doc.titulo ?? ""),
    activo: Boolean(doc.activo),
    orden: Number(doc.orden ?? 0),
  };
}

export const cmsService = new CmsService();
