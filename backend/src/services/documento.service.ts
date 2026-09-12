import { DocumentoModel } from "../models/documento.model";
import { ProyectoModel } from "../models/proyecto.model";
import { EspacioModel } from "../models/espacio.model";
import { StorageProvider } from "../adapters/storage/storage-provider.interface";
import { createStorageProvider } from "../adapters/storage/storage-provider.factory";
import { detectarTipoArchivo, TIPOS_ARCHIVO } from "../utils/archivos";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export type FamiliaDocumento = "proyecto" | "espacio";

interface DocumentoJson {
  id: string;
  titulo: string;
  descripcion: string;
  archivo: {
    url: string;
    nombre: string;
    tamañoBytes: number;
  };
  createdAt: Date;
}

function toJson(doc: Record<string, unknown>): DocumentoJson {
  const archivo = (doc.archivo ?? {}) as {
    url?: string;
    nombre?: string;
    tamañoBytes?: number;
  };
  return {
    id: String(doc._id),
    titulo: String(doc.titulo),
    descripcion: String(doc.descripcion ?? ""),
    archivo: {
      url: String(archivo.url ?? ""),
      nombre: String(archivo.nombre ?? ""),
      tamañoBytes: Number(archivo.tamañoBytes ?? 0),
    },
    createdAt: doc.createdAt as Date,
  };
}

/**
 * Documentación del entorno: manuales PDF que el admin sube y el cliente
 * descarga. Se listan, se suben y se eliminan (también del almacenamiento).
 */
export class DocumentoService {
  constructor(
    private readonly storage: StorageProvider = createStorageProvider(),
  ) {}

  async listar(
    familia: FamiliaDocumento,
    id: string,
    rol: "admin" | "cliente",
    userId: string,
  ): Promise<DocumentoJson[]> {
    logger.proceso("DocumentoService.listar", { familia, id });
    const propietario = await this.propietario(familia, id);
    if (rol === "cliente" && propietario !== userId) {
      throw ApiError.forbidden("No tienes acceso a esta documentación");
    }
    const filtro =
      familia === "proyecto" ? { proyectoId: id } : { espacioId: id };
    const docs = await DocumentoModel.find(filtro)
      .sort({ createdAt: -1 })
      .lean();
    logger.exito("DocumentoService.listar completado", {
      total: docs.length,
    });
    return docs.map(toJson);
  }

  async subir(
    familia: FamiliaDocumento,
    id: string,
    archivo: { buffer: Buffer; nombre: string; tamañoBytes: number },
    datos: { titulo: string; descripcion?: string },
    adminId: string,
  ): Promise<DocumentoJson> {
    logger.proceso("DocumentoService.subir", { familia, id });
    await this.propietario(familia, id);

    const detectado = detectarTipoArchivo(archivo.buffer);
    if (!detectado || detectado.mimeType !== TIPOS_ARCHIVO.pdf) {
      throw ApiError.validation(
        "El manual debe ser un archivo PDF (verificado por contenido)",
      );
    }
    const almacenado = await this.storage.upload({
      buffer: archivo.buffer,
      mimeType: TIPOS_ARCHIVO.pdf,
      folder: `documentos/${familia}/${id}`,
    });

    const doc = await DocumentoModel.create({
      ...(familia === "proyecto" ? { proyectoId: id } : { espacioId: id }),
      titulo: datos.titulo,
      descripcion: datos.descripcion ?? "",
      archivo: {
        url: almacenado.url,
        publicId: almacenado.publicId,
        nombre: archivo.nombre,
        tamañoBytes: archivo.tamañoBytes,
      },
      subidoPor: adminId,
    });
    logger.exito("DocumentoService.subir completado", {
      documentoId: String(doc._id),
    });
    return toJson(doc.toObject());
  }

  async eliminar(
    familia: FamiliaDocumento,
    id: string,
    documentoId: string,
  ): Promise<void> {
    logger.proceso("DocumentoService.eliminar", { familia, id });
    await this.propietario(familia, id);
    const filtro =
      familia === "proyecto"
        ? { _id: documentoId, proyectoId: id }
        : { _id: documentoId, espacioId: id };
    const doc = await DocumentoModel.findOne(filtro);
    if (!doc) throw ApiError.notFound("Documento no encontrado");
    if (doc.archivo?.publicId) {
      await this.storage.delete(doc.archivo.publicId);
    }
    await DocumentoModel.deleteOne({ _id: doc._id });
    logger.exito("DocumentoService.eliminar completado", { documentoId });
  }

  /** Devuelve el clienteId del entorno (valida que exista). */
  private async propietario(
    familia: FamiliaDocumento,
    id: string,
  ): Promise<string> {
    const doc =
      familia === "proyecto"
        ? await ProyectoModel.findById(id).select("clienteId").lean()
        : await EspacioModel.findById(id).select("clienteId").lean();
    if (!doc) {
      throw ApiError.notFound(
        familia === "proyecto"
          ? "Proyecto no encontrado"
          : "Espacio no encontrado",
      );
    }
    return String(doc.clienteId);
  }
}

export const documentoService = new DocumentoService();
