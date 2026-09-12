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

interface DescuentoJson {
  activo: boolean;
  porcentaje: number;
  mensaje: string;
  hasta: string | null;
}

interface EditorPatch {
  colores?: Partial<Colores>;
  marquesina?: Partial<{ texto: string; activo: boolean }>;
  textos?: Record<string, string>;
  descuento?: Partial<DescuentoJson> & { porcentaje?: number };
  diasExtra?: number;
  tasaCop?: number;
}

const DESCUENTO_DEFAULT = {
  activo: false,
  porcentaje: 20,
  mensaje: "",
  hasta: null,
};

function esEditorVacio(
  editor: Record<string, unknown> | null | undefined,
): boolean {
  return !editor || Object.keys(editor).length === 0;
}

/** Aplica el editor sobre la configuración actual (solo campos presentes). */
interface CmsConfigPublicEditor {
  colores: Colores;
  marquesina: { texto: string; activo: boolean };
  textos: Record<string, string>;
  descuento: DescuentoJson;
  diasExtra: number;
  tasaCop: number;
}

function plainTextos(textos: unknown): Record<string, string> {
  if (!textos) return {};
  if (textos instanceof Map) return Object.fromEntries(textos);
  return textos as Record<string, string>;
}

/** Aplica el editor sobre la configuración actual (solo campos presentes). */
function aplicarEditor(
  config: CmsConfigPublicEditor,
  editor: Record<string, unknown>,
): void {
  const e = editor as EditorPatch & Record<string, unknown>;
  if (e.colores && typeof e.colores === "object") {
    config.colores = { ...config.colores, ...(e.colores as Partial<Colores>) };
  }
  if (e.marquesina && typeof e.marquesina === "object") {
    config.marquesina = { ...config.marquesina, ...(e.marquesina as object) };
  }
  if (e.textos && typeof e.textos === "object") {
    config.textos = {
      ...config.textos,
      ...(e.textos as Record<string, string>),
    };
  }
  if (e.descuento && typeof e.descuento === "object") {
    config.descuento = {
      ...config.descuento,
      ...(e.descuento as object),
    } as DescuentoJson;
  }
  if (typeof e.diasExtra === "number") {
    config.diasExtra = e.diasExtra;
  }
  if (typeof e.tasaCop === "number") {
    config.tasaCop = e.tasaCop;
  }
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
      textos: plainTextos(config.textos),
      descuento: config.descuento ?? DESCUENTO_DEFAULT,
      diasExtra: config.diasExtra ?? 0,
      tasaCop: config.tasaCop ?? 0,
    };
  }

  /** Vista del editor (solo admin): configuración publicada + borrador pendiente. */
  async obtenerEditor() {
    logger.proceso("CmsService.obtenerEditor");
    const config = this.leerConfig(this.getOrCreate());
    const c = await config;
    return {
      publicado: {
        colores: this.aplicarDefaults(c.colores),
        marquesina: c.marquesina ?? { texto: "", activo: false },
        textos: plainTextos(c.textos),
        descuento: c.descuento ?? DESCUENTO_DEFAULT,
        diasExtra: c.diasExtra ?? 0,
        tasaCop: c.tasaCop ?? 0,
      },
      editor: c.editor ?? {},
    };
  }

  /** Guarda cambios en el BORRADOR (sin afectar la vitrina pública). */
  async actualizarEditor(patch: EditorPatch) {
    logger.proceso("CmsService.actualizarEditor");
    const c = await this.leerConfig(this.getOrCreate());
    const editorActual = (c.editor ?? {}) as Record<string, unknown>;

    const merge = (
      actual: Record<string, unknown> | undefined,
      nuevo: Record<string, unknown>,
    ) => ({
      ...(actual ?? {}),
      ...nuevo,
    });

    const editor: Record<string, unknown> = { ...editorActual };
    if (patch.colores)
      editor.colores = merge(
        editor.colores as Record<string, unknown> | undefined,
        patch.colores as Record<string, unknown>,
      );
    if (patch.marquesina)
      editor.marquesina = merge(
        editor.marquesina as Record<string, unknown> | undefined,
        patch.marquesina as Record<string, unknown>,
      );
    if (patch.textos)
      editor.textos = { ...plainTextos(editor.textos), ...patch.textos };
    if (patch.descuento)
      editor.descuento = merge(
        editor.descuento as Record<string, unknown> | undefined,
        patch.descuento as Record<string, unknown>,
      );
    if (typeof patch.diasExtra === "number") editor.diasExtra = patch.diasExtra;
    if (typeof patch.tasaCop === "number") editor.tasaCop = patch.tasaCop;

    c.editor = editor;
    await c.save();
    logger.exito("CmsService.actualizarEditor completado");
    return { editor };
  }

  /** Aplica el borrador a la vista pública y limpia los pendientes. */
  async publicarEditor() {
    logger.proceso("CmsService.publicarEditor");
    const c = await this.leerConfig(this.getOrCreate());
    const editor = (c.editor ?? {}) as Record<string, unknown>;

    if (esEditorVacio(editor)) {
      logger.exito("CmsService.publicarEditor: sin cambios pendientes");
      return { publicado: await this.obtenerPublico() };
    }

    const publico: CmsConfigPublicEditor = {
      colores: this.aplicarDefaults(c.colores),
      marquesina: c.marquesina ?? { texto: "", activo: false },
      textos: plainTextos(c.textos),
      descuento: c.descuento ?? DESCUENTO_DEFAULT,
      diasExtra: c.diasExtra ?? 0,
      tasaCop: c.tasaCop ?? 0,
    };
    aplicarEditor(publico, editor);

    c.colores = publico.colores;
    c.marquesina = publico.marquesina;
    c.textos = publico.textos as never;
    c.descuento = publico.descuento as never;
    c.diasExtra = publico.diasExtra;
    c.tasaCop = publico.tasaCop;
    c.editor = {};
    await c.save();

    logger.exito("CmsService.publicarEditor completado");
    return { publicado: await this.obtenerPublico() };
  }

  /** Tasa USD→COP publicada al instante (ajuste operativo de pagos). */
  async actualizarTasaCop(tasaCop: number): Promise<{ tasaCop: number }> {
    logger.proceso("CmsService.actualizarTasaCop", { tasaCop });
    const config = await this.getOrCreate();
    config.tasaCop = tasaCop;
    await config.save();
    logger.exito("CmsService.actualizarTasaCop completado", { tasaCop });
    return { tasaCop: config.tasaCop ?? 0 };
  }

  private aplicarDefaults(c: Partial<Colores> | null | undefined): Colores {
    return {
      primario: c?.primario ?? "#000000",
      secundario: c?.secundario ?? "#ffffff",
      acento: c?.acento ?? "#ffcc00",
    };
  }

  private async leerConfig(doc: Promise<unknown>): Promise<any> {
    return doc;
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
