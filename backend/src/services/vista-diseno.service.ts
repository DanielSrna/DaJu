import { VistaDisenoModel, VistaDiseno } from "../models/vista-diseno.model";
import { EspacioModel } from "../models/espacio.model";
import { StorageProvider } from "../adapters/storage/storage-provider.interface";
import { createStorageProvider } from "../adapters/storage/storage-provider.factory";
import {
  detectarTipoArchivo,
  optimizarImagen,
  TIPOS_IMAGEN,
  TIPOS_ARCHIVO,
} from "../utils/archivos";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

interface VistaDisenoJson {
  id: string;
  espacioId: string;
  nombre: string;
  orden: number;
  estado: "pendiente" | "negociacion" | "aprobada";
  muestraCliente: { url: string; publicId: string } | null;
  obraGris: { url: string; publicId: string } | null;
  archivos: Array<{
    url: string;
    publicId: string;
    nombre: string;
    mimeType: string;
    tamañoBytes: number;
  }>;
  createdAt: Date;
}

function toJson(doc: Record<string, unknown>): VistaDisenoJson {
  return {
    id: String(doc._id),
    espacioId: String(doc.espacioId),
    nombre: String(doc.nombre),
    orden: Number(doc.orden ?? 0),
    estado: (doc.estado as VistaDisenoJson["estado"]) ?? "pendiente",
    muestraCliente:
      (doc.muestraCliente as VistaDisenoJson["muestraCliente"]) ?? null,
    obraGris: (doc.obraGris as VistaDisenoJson["obraGris"]) ?? null,
    archivos: (doc.archivos as VistaDisenoJson["archivos"]) ?? [],
    createdAt: doc.createdAt as Date,
  };
}

export interface ArchivoImagen {
  buffer: Buffer;
  nombre: string;
}

export class VistaDisenoService {
  constructor(
    private readonly storage: StorageProvider = createStorageProvider(),
  ) {}

  private async espacioPropio(
    espacioId: string,
    clienteId?: string,
  ): Promise<void> {
    const query = clienteId
      ? { _id: espacioId, clienteId }
      : { _id: espacioId };
    const espacio = await EspacioModel.findOne(query);
    if (!espacio) throw ApiError.notFound("Espacio no encontrado");
  }

  async listar(
    espacioId: string,
    clienteId?: string,
  ): Promise<VistaDisenoJson[]> {
    logger.proceso("VistaDisenoService.listar", { espacioId });
    await this.espacioPropio(espacioId, clienteId);
    const docs = await VistaDisenoModel.find({ espacioId })
      .sort({ orden: 1, createdAt: 1 })
      .lean();
    return docs.map(toJson);
  }

  async crear(
    espacioId: string,
    datos: {
      nombre: string;
      orden?: number;
      costoSugerido?: number;
      descripcion?: string;
    },
  ): Promise<VistaDisenoJson> {
    logger.proceso("VistaDisenoService.crear", { espacioId });
    await this.espacioPropio(espacioId);
    const doc = await VistaDisenoModel.create({
      espacioId,
      nombre: datos.nombre,
      orden: datos.orden ?? 0,
      estado: "cotizacion",
    });
    // Una vista = una función: abre su negociación (solicitud de cotización).
    try {
      const { SolicitudFuncionModel } =
        await import("../models/solicitud-funcion.model");
      await SolicitudFuncionModel.create({
        espacioId,
        titulo: datos.nombre,
        descripcion:
          datos.descripcion?.trim() ||
          `Función/vista solicitada por el cliente: ${datos.nombre}`,
        estado: "abierta",
        costo: 0,
        costoSugerido: datos.costoSugerido ?? 0,
        origen: datos.costoSugerido ? "catalogo" : "personalizada",
        respuestaAdmin: "",
      });
      const { notificacionService } = await import("./notificacion.service");
      await notificacionService.crearAdmins({
        tipo: "proyecto",
        titulo: "Nueva vista/función solicitada",
        cuerpo: datos.nombre,
        contexto: "solicitud",
        contextoId: doc._id,
      });
    } catch (error) {
      logger.fracaso("VistaDisenoService.crear: solicitud/notificación falló", {
        error: (error as Error).message,
      });
    }
    logger.exito("VistaDisenoService.crear completado", {
      vistaId: String(doc._id),
    });
    return toJson(doc.toObject());
  }

  /** Admin cambia estado (pendiente/negociacion/aprobada) o el nombre. */
  async actualizar(
    vistaId: string,
    datos: { estado?: VistaDiseno["estado"]; nombre?: string; orden?: number },
  ): Promise<VistaDisenoJson> {
    logger.proceso("VistaDisenoService.actualizar", { vistaId });
    const doc = await VistaDisenoModel.findByIdAndUpdate(
      vistaId,
      dataAct(vistaId, datos),
      { new: true, runValidators: true },
    );
    if (!doc) throw ApiError.notFound("Vista no encontrada");
    logger.exito("VistaDisenoService.actualizar completado", { vistaId });
    return toJson(doc.toObject());
  }

  async subirObraGris(
    vistaId: string,
    archivo: ArchivoImagen,
  ): Promise<VistaDisenoJson> {
    logger.proceso("VistaDisenoService.subirObraGris", { vistaId });
    const doc = await VistaDisenoModel.findById(vistaId);
    if (!doc) throw ApiError.notFound("Vista no encontrada");
    const obraGris = await this.validarYSubir(
      archivo,
      `vistas/${vistaId}/obra-gris`,
    );
    if (doc.obraGris?.publicId)
      await this.storage.delete(doc.obraGris.publicId);
    doc.obraGris = obraGris as unknown as NonNullable<typeof doc.obraGris>;
    await doc.save();
    return toJson(doc.toObject());
  }

  async subirMuestraCliente(
    vistaId: string,
    archivo: ArchivoImagen,
  ): Promise<VistaDisenoJson> {
    logger.proceso("VistaDisenoService.subirMuestraCliente", { vistaId });
    const doc = await VistaDisenoModel.findById(vistaId);
    if (!doc) throw ApiError.notFound("Vista no encontrada");
    const muestra = await this.validarYSubir(
      archivo,
      `vistas/${vistaId}/muestra`,
    );
    if (doc.muestraCliente?.publicId)
      await this.storage.delete(doc.muestraCliente.publicId);
    doc.muestraCliente = muestra as unknown as NonNullable<
      typeof doc.muestraCliente
    >;
    await doc.save();
    return toJson(doc.toObject());
  }

  /** Sube un documento (imagen o PDF) a la vista. Cualquiera con acceso. */
  async agregarArchivo(
    vistaId: string,
    archivo: ArchivoImagen,
    clienteId?: string,
  ): Promise<VistaDisenoJson> {
    logger.proceso("VistaDisenoService.agregarArchivo", { vistaId });
    await this.verificarCliente(vistaId, clienteId);
    const doc = await VistaDisenoModel.findById(vistaId);
    if (!doc) throw ApiError.notFound("Vista no encontrada");
    const almacenado = await this.validarYGuardar(
      archivo,
      `vistas/${vistaId}/archivos`,
    );
    doc.archivos = [
      ...((doc.archivos as VistaDisenoJson["archivos"]) ?? []),
      almacenado,
    ] as unknown as typeof doc.archivos;
    await doc.save();
    logger.exito("VistaDisenoService.agregarArchivo completado", { vistaId });
    return toJson(doc.toObject());
  }

  async eliminarArchivo(
    vistaId: string,
    archivoPublicId: string,
    clienteId?: string,
  ): Promise<VistaDisenoJson> {
    logger.proceso("VistaDisenoService.eliminarArchivo", {
      vistaId,
      archivoPublicId,
    });
    await this.verificarCliente(vistaId, clienteId);
    const doc = await VistaDisenoModel.findById(vistaId);
    if (!doc) throw ApiError.notFound("Vista no encontrada");
    const lista = (doc.archivos as VistaDisenoJson["archivos"]) ?? [];
    const existe = lista.some((a) => a.publicId === archivoPublicId);
    if (!existe) throw ApiError.notFound("El archivo no está en esta vista");

    await this.storage.delete(archivoPublicId);
    doc.archivos = lista.filter(
      (a) => a.publicId !== archivoPublicId,
    ) as unknown as typeof doc.archivos;
    await doc.save();
    return toJson(doc.toObject());
  }

  /** Cliente no propietario no puede tocar la vista. */
  private async verificarCliente(
    vistaId: string,
    clienteId?: string,
  ): Promise<void> {
    if (!clienteId) return;
    const doc = await VistaDisenoModel.findById(vistaId).select("espacioId");
    if (!doc) throw ApiError.notFound("Vista no encontrada");
    const espacio = await EspacioModel.findOne({
      _id: doc.espacioId,
      clienteId,
    });
    if (!espacio) throw ApiError.forbidden("No tienes acceso a esta vista");
  }

  private async validarYGuardar(
    archivo: ArchivoImagen,
    folder: string,
  ): Promise<VistaDisenoJson["archivos"][number]> {
    const detectado = detectarTipoArchivo(archivo.buffer);
    const permitidos: string[] = [...TIPOS_IMAGEN, TIPOS_ARCHIVO.pdf];
    if (!detectado || !permitidos.includes(detectado.mimeType)) {
      logger.fracaso("VistaDisenoService.validarYGuardar: tipo no permitido", {
        nombre: archivo.nombre,
      });
      throw ApiError.validation(
        "El archivo debe ser una imagen (JPG/PNG/WebP) o un PDF (verificado por contenido)",
      );
    }
    const esImagen = TIPOS_IMAGEN.includes(detectado.mimeType);
    if (esImagen) {
      const optimizado = await optimizarImagen(
        archivo.buffer,
        detectado.mimeType,
      );
      const almacenada = await this.storage.upload({
        buffer: optimizado.buffer,
        mimeType: optimizado.mimeType,
        folder,
      });
      return {
        url: almacenada.url,
        publicId: almacenada.publicId,
        nombre: archivo.nombre,
        mimeType: detectado.mimeType,
        tamañoBytes: archivo.buffer.byteLength,
      };
    }
    const almacenada = await this.storage.upload({
      buffer: archivo.buffer,
      mimeType: detectado.mimeType,
      folder,
    });
    return {
      url: almacenada.url,
      publicId: almacenada.publicId,
      nombre: archivo.nombre,
      mimeType: detectado.mimeType,
      tamañoBytes: archivo.buffer.byteLength,
    };
  }

  private async validarYSubir(
    archivo: ArchivoImagen,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    const detectado = detectarTipoArchivo(archivo.buffer);
    if (!detectado || !TIPOS_IMAGEN.includes(detectado.mimeType)) {
      logger.fracaso("VistaDisenoService.validarYSubir: no es imagen", {
        nombre: archivo.nombre,
      });
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

function dataAct(
  _vistaId: string,
  datos: { estado?: VistaDiseno["estado"]; nombre?: string; orden?: number },
): Record<string, unknown> {
  const upd: Record<string, unknown> = {};
  if (datos.estado) upd.estado = datos.estado;
  if (typeof datos.nombre === "string") upd.nombre = datos.nombre;
  if (typeof datos.orden === "number") upd.orden = datos.orden;
  return upd;
}

export const vistaDisenoService = new VistaDisenoService();
