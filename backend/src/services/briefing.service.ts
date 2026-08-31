import { BriefingModel, Briefing } from "../models/briefing.model";
import { ProyectoModel } from "../models/proyecto.model";
import { StorageProvider } from "../adapters/storage/storage-provider.interface";
import { createStorageProvider } from "../adapters/storage/storage-provider.factory";
import {
  detectarTipoArchivo,
  optimizarImagen,
  TIPOS_ARCHIVO,
  TIPOS_IMAGEN,
} from "../utils/archivos";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export interface ArchivoSubido {
  buffer: Buffer;
  nombre: string;
  tamañoBytes: number;
  tipo: "logo" | "imagen" | "pdf" | "otro";
}

interface ArchivoJson {
  id: string;
  publicId: string;
  url: string;
  nombre: string;
  mimeType: string;
  tamañoBytes: number;
  tipo: "logo" | "imagen" | "pdf" | "otro";
}

interface BriefingJson {
  id: string;
  proyectoId: string;
  contenido: Briefing["contenido"];
  archivos: ArchivoJson[];
  completado: boolean;
  updatedAt: Date;
}

/**
 * Documento maestro: el cliente completa textos, logos y requerimientos
 * tras la compra. Alimenta el proyecto (ver CONTEXT.md).
 */
export class BriefingService {
  constructor(
    private readonly storage: StorageProvider = createStorageProvider(),
  ) {}

  async obtener(
    proyectoId: string,
    rol: "admin" | "cliente",
    userId: string,
  ): Promise<BriefingJson> {
    logger.proceso("BriefingService.obtener", { proyectoId });
    await this.verificarAcceso(proyectoId, rol, userId);
    const briefing = await this.getOrCreate(proyectoId);
    return toJson(briefing.toObject() as Record<string, unknown>);
  }

  async guardarContenido(
    proyectoId: string,
    rol: "admin" | "cliente",
    userId: string,
    contenido: Partial<NonNullable<Briefing["contenido"]>>,
    completado?: boolean,
  ): Promise<BriefingJson> {
    logger.proceso("BriefingService.guardarContenido", { proyectoId });
    await this.verificarAcceso(proyectoId, rol, userId);

    const briefing = await this.getOrCreate(proyectoId);
    briefing.contenido = {
      empresa: contenido.empresa ?? briefing.contenido?.empresa ?? "",
      descripcionNegocio:
        contenido.descripcionNegocio ??
        briefing.contenido?.descripcionNegocio ??
        "",
      objetivos: contenido.objetivos ?? briefing.contenido?.objetivos ?? "",
      textos: contenido.textos ?? briefing.contenido?.textos ?? {},
      requerimientos:
        contenido.requerimientos ?? briefing.contenido?.requerimientos ?? "",
      extras: contenido.extras ?? briefing.contenido?.extras ?? {},
    };
    if (completado !== undefined) {
      briefing.completado = completado;
    }
    await briefing.save();

    logger.exito("BriefingService.guardarContenido completado", {
      proyectoId,
      completado: briefing.completado,
    });
    return toJson(briefing.toObject() as Record<string, unknown>);
  }

  async agregarArchivo(
    proyectoId: string,
    rol: "admin" | "cliente",
    userId: string,
    archivo: ArchivoSubido,
  ): Promise<BriefingJson> {
    logger.proceso("BriefingService.agregarArchivo", {
      proyectoId,
      nombre: archivo.nombre,
    });
    await this.verificarAcceso(proyectoId, rol, userId);

    const detectado = detectarTipoArchivo(archivo.buffer);
    if (!detectado) {
      logger.fracaso("BriefingService.agregarArchivo: tipo no permitido", {
        nombre: archivo.nombre,
      });
      throw ApiError.validation(
        "Tipo de archivo no permitido. Usa JPG, PNG, WebP o PDF (verificado por contenido)",
      );
    }

    if (archivo.tipo === "logo" && !TIPOS_IMAGEN.includes(detectado.mimeType)) {
      throw ApiError.validation(
        "El logo debe ser una imagen (JPG, PNG o WebP)",
      );
    }
    if (archivo.tipo === "pdf" && detectado.mimeType !== TIPOS_ARCHIVO.pdf) {
      throw ApiError.validation("El archivo debe ser un PDF válido");
    }
    if (
      archivo.tipo === "imagen" &&
      !TIPOS_IMAGEN.includes(detectado.mimeType)
    ) {
      throw ApiError.validation(
        "El archivo debe ser una imagen (JPG, PNG o WebP)",
      );
    }

    const optimizado = await optimizarImagen(
      archivo.buffer,
      detectado.mimeType,
    );

    const almacenado = await this.storage.upload({
      buffer: optimizado.buffer,
      mimeType: optimizado.mimeType,
      folder: `briefings/${proyectoId}`,
    });

    const briefing = await this.getOrCreate(proyectoId);
    briefing.archivos.push({
      publicId: almacenado.publicId,
      url: almacenado.url,
      nombre: archivo.nombre,
      mimeType: optimizado.mimeType,
      tamañoBytes: almacenado.sizeBytes,
      tipo: archivo.tipo,
    });
    await briefing.save();

    logger.exito("BriefingService.agregarArchivo completado", {
      proyectoId,
      publicId: almacenado.publicId,
    });
    return toJson(briefing.toObject() as Record<string, unknown>);
  }

  async eliminarArchivo(
    proyectoId: string,
    rol: "admin" | "cliente",
    userId: string,
    archivoId: string,
  ): Promise<BriefingJson> {
    logger.proceso("BriefingService.eliminarArchivo", {
      proyectoId,
      archivoId,
    });
    await this.verificarAcceso(proyectoId, rol, userId);

    const briefing = await this.getOrCreate(proyectoId);
    const archivo = briefing.archivos.find((a) => String(a._id) === archivoId);
    if (!archivo) {
      logger.fracaso("BriefingService.eliminarArchivo: archivo no encontrado", {
        archivoId,
      });
      throw ApiError.notFound("Archivo no encontrado en el briefing");
    }

    await this.storage.delete(archivo.publicId);
    briefing.archivos = briefing.archivos.filter(
      (a) => String(a._id) !== archivoId,
    ) as unknown as typeof briefing.archivos;
    await briefing.save();

    logger.exito("BriefingService.eliminarArchivo completado", { archivoId });
    return toJson(briefing.toObject() as Record<string, unknown>);
  }

  /** Acceso: el cliente solo puede operar sobre sus propios proyectos. */
  private async verificarAcceso(
    proyectoId: string,
    rol: "admin" | "cliente",
    userId: string,
  ): Promise<void> {
    const proyecto = await ProyectoModel.findById(proyectoId);
    if (!proyecto) {
      logger.fracaso("BriefingService.verificarAcceso: proyecto no existe", {
        proyectoId,
      });
      throw ApiError.notFound("Proyecto no encontrado");
    }
    if (rol === "cliente" && String(proyecto.clienteId) !== userId) {
      logger.fracaso("BriefingService.verificarAcceso: proyecto ajeno", {
        proyectoId,
      });
      throw ApiError.forbidden("No tienes acceso a este proyecto");
    }
  }

  private async getOrCreate(proyectoId: string) {
    const existente = await BriefingModel.findOne({ proyectoId });
    if (existente) return existente;

    const proyecto =
      await ProyectoModel.findById(proyectoId).select("clienteId");
    if (!proyecto) {
      throw ApiError.notFound("Proyecto no encontrado");
    }
    return BriefingModel.create({
      proyectoId,
      clienteId: proyecto.clienteId,
      contenido: {},
      archivos: [],
      completado: false,
    });
  }
}

function toJson(doc: Record<string, unknown>): BriefingJson {
  const archivos = (doc.archivos as Briefing["archivos"]) ?? [];
  return {
    id: String(doc._id),
    proyectoId: String(doc.proyectoId),
    contenido:
      (doc.contenido as Briefing["contenido"] | undefined) ??
      ({} as Briefing["contenido"]),
    archivos: archivos.map((a) => ({
      id: String(a._id),
      publicId: a.publicId,
      url: a.url,
      nombre: a.nombre,
      mimeType: a.mimeType,
      tamañoBytes: a.tamañoBytes,
      tipo: a.tipo,
    })),
    completado: (doc.completado as boolean) ?? false,
    updatedAt: new Date(doc.updatedAt as string),
  };
}

export const briefingService = new BriefingService();
