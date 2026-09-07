import { BriefingModel, Briefing } from "../models/briefing.model";
import { ProyectoModel } from "../models/proyecto.model";
import { SolicitudFuncionModel } from "../models/solicitud-funcion.model";
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
import { bitacoraService } from "./bitacora.service";

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
  contenido: {
    empresa?: string;
    descripcionNegocio?: string;
    objetivos?: string;
    requerimientos?: string;
    resumen?:
      | (Record<string, unknown> & {
          descripcionNegocio?: string;
          objetivos?: string;
        })
      | null;
    tinta?: Record<string, unknown>;
    textos?: Record<string, unknown>;
    extras?: Record<string, unknown>;
    identidad?: Record<string, unknown> | null;
    vistas: Array<{
      id: string;
      nombre: string;
      requisitos: string;
      semaforo: "pendiente" | "negociacion" | "aprobada";
      obraGris: { url: string; publicId: string } | null;
      archivos: Array<{
        url: string;
        publicId: string;
        nombre: string;
        mimeType: string;
        tamañoBytes: number;
      }>;
    }>;
  };
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
    const actual = (briefing.contenido ?? {}) as NonNullable<
      Briefing["contenido"]
    >;
    briefing.contenido = {
      empresa: contenido.empresa ?? actual.empresa ?? "",
      descripcionNegocio:
        contenido.descripcionNegocio ?? actual.descripcionNegocio ?? "",
      objetivos: contenido.objetivos ?? actual.objetivos ?? "",
      textos: contenido.textos ?? actual.textos ?? {},
      requerimientos: contenido.requerimientos ?? actual.requerimientos ?? "",
      extras: contenido.extras ?? actual.extras ?? {},
      // --- V2: se conserva lo existente y solo se pisa lo que llega ---
      resumen: {
        nombreProyecto:
          contenido.resumen?.nombreProyecto ??
          actual.resumen?.nombreProyecto ??
          "",
        descripcionNegocio:
          contenido.resumen?.descripcionNegocio ??
          actual.resumen?.descripcionNegocio ??
          "",
        objetivos:
          contenido.resumen?.objetivos ?? actual.resumen?.objetivos ?? "",
        problemaActual:
          contenido.resumen?.problemaActual ??
          actual.resumen?.problemaActual ??
          "",
        flujoPrincipal:
          contenido.resumen?.flujoPrincipal ??
          actual.resumen?.flujoPrincipal ??
          "",
        ejemploFlujo:
          contenido.resumen?.ejemploFlujo ?? actual.resumen?.ejemploFlujo ?? "",
        plazoDeseado:
          contenido.resumen?.plazoDeseado ?? actual.resumen?.plazoDeseado ?? "",
        noIncluir:
          contenido.resumen?.noIncluir ?? actual.resumen?.noIncluir ?? "",
        referenciasLinks:
          contenido.resumen?.referenciasLinks ??
          actual.resumen?.referenciasLinks ??
          "",
        identidadActual:
          contenido.resumen?.identidadActual ??
          actual.resumen?.identidadActual ??
          "",
        idioma:
          contenido.resumen?.idioma ?? actual.resumen?.idioma ?? "Español",
        usuarios: {
          cantidad:
            contenido.resumen?.usuarios?.cantidad ??
            actual.resumen?.usuarios?.cantidad ??
            0,
          tipos:
            contenido.resumen?.usuarios?.tipos ??
            actual.resumen?.usuarios?.tipos ??
            [],
          permisos:
            contenido.resumen?.usuarios?.permisos ??
            actual.resumen?.usuarios?.permisos ??
            [],
        },
      },
      vistas: contenido.vistas ?? actual.vistas ?? [],
      identidad: {
        fuentes: {
          tipo:
            contenido.identidad?.fuentes?.tipo ??
            actual.identidad?.fuentes?.tipo ??
            "lista",
          valor:
            contenido.identidad?.fuentes?.valor ??
            actual.identidad?.fuentes?.valor ??
            "",
          notas:
            contenido.identidad?.fuentes?.notas ??
            actual.identidad?.fuentes?.notas ??
            "",
        },
        colores: {
          tipo:
            contenido.identidad?.colores?.tipo ??
            actual.identidad?.colores?.tipo ??
            "lista",
          valor:
            contenido.identidad?.colores?.valor ??
            actual.identidad?.colores?.valor ??
            "",
          notas:
            contenido.identidad?.colores?.notas ??
            actual.identidad?.colores?.notas ??
            "",
        },
        vibra: {
          tipo:
            contenido.identidad?.vibra?.tipo ??
            actual.identidad?.vibra?.tipo ??
            "lista",
          valor:
            contenido.identidad?.vibra?.valor ??
            actual.identidad?.vibra?.valor ??
            "",
          notas:
            contenido.identidad?.vibra?.notas ??
            actual.identidad?.vibra?.notas ??
            "",
        },
      },
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

  /**
   * Actualiza una vista del briefing (requisitos del cliente o semáforo del
   * admin). La negociación de detalle hace cada uno en el chat (ctx "vista").
   */
  async actualizarVista(
    proyectoId: string,
    vistaId: string,
    datos: {
      requisitos?: string;
      semaforo?: "pendiente" | "negociacion" | "aprobada";
      nombre?: string;
    },
    rol: "admin" | "cliente",
    userId: string,
  ): Promise<BriefingJson> {
    logger.proceso("BriefingService.actualizarVista", { proyectoId, vistaId });
    await this.verificarAcceso(proyectoId, rol, userId);

    // El cliente define REQUISITOS; el semáforo y el nombre los maneja el admin.
    if (rol !== "admin" && (datos.semaforo || datos.nombre !== undefined)) {
      throw ApiError.forbidden(
        "Solo el equipo puede cambiar el semáforo o el nombre de la vista",
      );
    }

    const briefing = await this.getOrCreate(proyectoId);
    if (!briefing.contenido?.vistas?.length) {
      throw ApiError.notFound("La vista no existe en este briefing");
    }
    const lista = (briefing.contenido.vistas ?? []) as unknown as Array<{
      _id: unknown;
      requisitos?: string;
      semaforo?: string;
      nombre?: string;
    }>;
    const vista = lista.find((v) => String(v._id) === vistaId);
    if (!vista) throw ApiError.notFound("La vista no existe en este briefing");

    if (typeof datos.requisitos === "string")
      vista.requisitos = datos.requisitos;
    if (datos.semaforo) vista.semaforo = datos.semaforo;
    if (datos.nombre) vista.nombre = datos.nombre;
    briefing.markModified("contenido.vistas");
    await briefing.save();

    logger.exito("BriefingService.actualizarVista completado", { vistaId });
    void bitacoraService.registrar({
      proyectoId,
      tipo: "vista",
      mensaje: datos.semaforo
        ? `La vista "${vista.nombre}" pasó a ${datos.semaforo}`
        : `Requisitos actualizados en "${vista.nombre}"`,
      creadaPor: userId,
    });
    return toJson(briefing.toObject() as Record<string, unknown>);
  }

  /** Agrega una vista/función al briefing (el cliente amplía su paquete aquí). */
  async agregarVista(
    proyectoId: string,
    rol: "admin" | "cliente",
    userId: string,
    nombre: string,
  ): Promise<BriefingJson> {
    logger.proceso("BriefingService.agregarVista", { proyectoId, nombre });
    await this.verificarAcceso(proyectoId, rol, userId);

    const briefing = await this.getOrCreate(proyectoId);
    const lista = (briefing.contenido?.vistas ?? []) as unknown as Array<{
      nombre?: string;
    }>;
    if (lista.length >= 20) {
      throw ApiError.validation("Máximo 20 vistas por proyecto");
    }
    if (lista.some((v) => v.nombre?.toLowerCase() === nombre.toLowerCase())) {
      throw ApiError.conflict("Ya existe una vista con ese nombre");
    }

    await BriefingModel.updateOne(
      { _id: briefing._id },
      {
        $push: {
          "contenido.vistas": {
            nombre,
            requisitos: "",
            semaforo: "cotizacion",
          },
        },
      },
    );

    const actualizado = await BriefingModel.findById(briefing._id);
    if (!actualizado) throw ApiError.notFound("Briefing no encontrado");

    // La vista/función abre su NEGOCIACIÓN: una solicitud que el admin cotiza
    // y el cliente paga antes de que quede lista para desarrollar.
    await SolicitudFuncionModel.create({
      proyectoId,
      titulo: nombre,
      descripcion: `Función/vista solicitada por el cliente: ${nombre}`,
      estado: "abierta",
      costo: 0,
      respuestaAdmin: "",
    });

    logger.exito("BriefingService.agregarVista completado", { proyectoId });
    void bitacoraService.registrar({
      proyectoId,
      tipo: "funcion",
      mensaje: `Función/vista nueva: "${nombre}"`,
      creadaPor: userId,
    });
    return toJson(actualizado.toObject());
  }

  /** Exporta briefing + vistas + requisitos como texto plano (informe). */
  async exportarTexto(
    proyectoId: string,
    rol: "admin" | "cliente",
    userId: string,
  ): Promise<string> {
    await this.verificarAcceso(proyectoId, rol, userId);
    const briefing = await this.getOrCreate(proyectoId);
    const c = (briefing.contenido ?? {}) as Record<string, unknown>;
    const r = (c.resumen ?? {}) as Record<string, unknown>;
    const u = (r.usuarios ?? {}) as Record<string, unknown>;
    const vistas = (c.vistas ?? []) as unknown as Array<
      Record<string, unknown>
    >;

    const lineas: string[] = [];
    lineas.push("=== BRIEFING DEL PROYECTO ===", "");
    lineas.push(`Proyecto: ${r.nombreProyecto ?? ""}`);
    lineas.push(`Negocio: ${r.descripcionNegocio ?? ""}`);
    lineas.push(`Objetivos: ${r.objetivos ?? ""}`);
    lineas.push(`Cómo lo resuelven hoy: ${r.problemaActual ?? ""}`);
    lineas.push(`Flujo principal: ${r.flujoPrincipal ?? ""}`);
    lineas.push(`Ejemplo de flujo: ${r.ejemploFlujo ?? ""}`);
    lineas.push(`Plazo deseado: ${r.plazoDeseado ?? ""}`);
    lineas.push(`No incluir: ${r.noIncluir ?? ""}`);
    lineas.push(`Referencias (links): ${r.referenciasLinks ?? ""}`);
    lineas.push(`Identidad actual: ${r.identidadActual ?? ""}`);
    lineas.push(`Idioma: ${r.idioma ?? "Español"}`);
    lineas.push(
      `Usuarios: ${u.cantidad ?? 0} · Tipos: ${Array.isArray(u.tipos) ? u.tipos.join(", ") : ""}`,
    );
    lineas.push(
      `Permisos: ${Array.isArray(u.permisos) ? u.permisos.join(", ") : ""}`,
    );
    lineas.push("");
    lineas.push("=== VISTAS / FUNCIONES ===");
    vistas.forEach((v, i) => {
      lineas.push("");
      lineas.push(`${i + 1}. ${v.nombre} [${v.semaforo ?? "pendiente"}]`);
      lineas.push(`   Requisitos: ${v.requisitos ?? ""}`);
      if ((v.archivos as Array<unknown>)?.length)
        lineas.push(
          `   Archivos: ${(v.archivos as Array<Record<string, unknown>>).map((a) => a.nombre).join(", ")}`,
        );
    });
    lineas.push("");
    lineas.push("=== IDENTIDAD VISUAL ===");
    const ident = (c.identidad ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    for (const k of ["fuentes", "colores", "vibra"]) {
      const pref = ident[k] as Record<string, unknown> | undefined;
      if (pref) {
        lineas.push(
          `${k}: ${pref.tipo ?? ""}${pref.valor ? ` — ${pref.valor}` : ""}${pref.notas ? ` (${pref.notas})` : ""}`,
        );
      }
    }
    return lineas.join("\n");
  }

  /** Sube la obra gris de una vista del briefing (admin). */
  async subirObraGrisVista(
    proyectoId: string,
    vistaId: string,
    rol: "admin" | "cliente",
    userId: string,
    archivo: ArchivoSubido,
  ): Promise<BriefingJson> {
    logger.proceso("BriefingService.subirObraGrisVista", {
      proyectoId,
      vistaId,
    });
    await this.verificarAcceso(proyectoId, rol, userId);
    if (rol !== "admin") {
      throw ApiError.forbidden("Solo el equipo puede publicar la obra gris");
    }

    const briefing = await this.getOrCreate(proyectoId);
    const lista = (briefing.contenido?.vistas ?? []) as unknown as Array<{
      _id: unknown;
      obraGris?: { url: string; publicId: string } | null;
    }>;
    const vista = lista.find((v) => String(v._id) === vistaId);
    if (!vista) throw ApiError.notFound("La vista no existe en este briefing");

    const detectado = detectarTipoArchivo(archivo.buffer);
    if (!detectado || !TIPOS_IMAGEN.includes(detectado.mimeType)) {
      throw ApiError.validation(
        "La obra gris debe ser una imagen JPG, PNG o WebP (verificado por contenido)",
      );
    }
    const optimizado = await optimizarImagen(
      archivo.buffer,
      detectado.mimeType,
    );
    const almacenada = await this.storage.upload({
      buffer: optimizado.buffer,
      mimeType: optimizado.mimeType,
      folder: `briefings/${proyectoId}/vistas/${vistaId}/obra-gris`,
    });
    if (vista.obraGris?.publicId) {
      await this.storage.delete(vista.obraGris.publicId);
    }
    vista.obraGris = { url: almacenada.url, publicId: almacenada.publicId };
    briefing.markModified("contenido.vistas");
    await briefing.save();

    logger.exito("BriefingService.subirObraGrisVista completado", { vistaId });
    return toJson(briefing.toObject() as Record<string, unknown>);
  }

  /** Sube un documento (imagen o PDF) a una vista del briefing. */
  async agregarArchivoVista(
    proyectoId: string,
    vistaId: string,
    rol: "admin" | "cliente",
    userId: string,
    archivo: ArchivoSubido,
  ): Promise<BriefingJson> {
    logger.proceso("BriefingService.agregarArchivoVista", {
      proyectoId,
      vistaId,
    });
    await this.verificarAcceso(proyectoId, rol, userId);

    const briefing = await this.getOrCreate(proyectoId);
    const lista = (briefing.contenido?.vistas ?? []) as unknown as Array<{
      _id: unknown;
      archivos?: Array<{
        url: string;
        publicId: string;
        nombre: string;
        mimeType: string;
        tamañoBytes: number;
      }>;
    }>;
    const vista = lista.find((v) => String(v._id) === vistaId);
    if (!vista) throw ApiError.notFound("La vista no existe en este briefing");

    const detectado = detectarTipoArchivo(archivo.buffer);
    const permitidos: string[] = [...TIPOS_IMAGEN, TIPOS_ARCHIVO.pdf];
    if (!detectado || !permitidos.includes(detectado.mimeType)) {
      throw ApiError.validation(
        "El archivo debe ser una imagen (JPG/PNG/WebP) o un PDF (verificado por contenido)",
      );
    }
    let buffer = archivo.buffer;
    let mime = detectado.mimeType;
    if (TIPOS_IMAGEN.includes(detectado.mimeType)) {
      const optimizado = await optimizarImagen(
        archivo.buffer,
        detectado.mimeType,
      );
      buffer = optimizado.buffer;
      mime = optimizado.mimeType;
    }
    const almacenada = await this.storage.upload({
      buffer,
      mimeType: mime,
      folder: `briefings/${proyectoId}/vistas/${vistaId}/archivos`,
    });
    vista.archivos = [
      ...(vista.archivos ?? []),
      {
        url: almacenada.url,
        publicId: almacenada.publicId,
        nombre: archivo.nombre,
        mimeType: mime,
        tamañoBytes: archivo.tamañoBytes,
      },
    ];
    briefing.markModified("contenido.vistas");
    await briefing.save();

    logger.exito("BriefingService.agregarArchivoVista completado", { vistaId });
    return toJson(briefing.toObject() as Record<string, unknown>);
  }

  async eliminarArchivoVista(
    proyectoId: string,
    vistaId: string,
    archivoPublicId: string,
    rol: "admin" | "cliente",
    userId: string,
  ): Promise<BriefingJson> {
    logger.proceso("BriefingService.eliminarArchivoVista", {
      proyectoId,
      vistaId,
    });
    await this.verificarAcceso(proyectoId, rol, userId);

    const briefing = await this.getOrCreate(proyectoId);
    const lista = (briefing.contenido?.vistas ?? []) as unknown as Array<{
      _id: unknown;
      archivos?: Array<{ publicId: string }>;
    }>;
    const vista = lista.find((v) => String(v._id) === vistaId);
    if (!vista) throw ApiError.notFound("La vista no existe en este briefing");
    const existe = (vista.archivos ?? []).some(
      (a) => a.publicId === archivoPublicId,
    );
    if (!existe) throw ApiError.notFound("El archivo no está en esta vista");
    await this.storage.delete(archivoPublicId);
    vista.archivos = (vista.archivos ?? []).filter(
      (a) => a.publicId !== archivoPublicId,
    );
    briefing.markModified("contenido.vistas");
    await briefing.save();
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
  const contenido = (doc.contenido ??
    {}) as Briefing["contenido"] as NonNullable<Briefing["contenido"]>;
  const vistasJson = (
    (contenido.vistas ?? []) as unknown as Array<
      Record<string, unknown> & { _id?: unknown }
    >
  ).map((v) => ({
    id: String(v._id ?? ""),
    nombre: String(v.nombre ?? ""),
    requisitos: String(v.requisitos ?? ""),
    semaforo:
      (v.semaforo as "pendiente" | "negociacion" | "aprobada") ?? "pendiente",
    obraGris: (v.obraGris as { url: string; publicId: string } | null) ?? null,
    archivos:
      (v.archivos as Array<{
        url: string;
        publicId: string;
        nombre: string;
        mimeType: string;
        tamañoBytes: number;
      }>) ?? [],
  }));
  return {
    id: String(doc._id),
    proyectoId: String(doc.proyectoId),
    contenido: {
      ...(contenido as Record<string, unknown>),
      vistas: vistasJson,
    } as unknown as BriefingJson["contenido"],
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
