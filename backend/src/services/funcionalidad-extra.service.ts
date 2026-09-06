import {
  FuncionalidadExtraModel,
  FuncionalidadExtra,
} from "../models/funcionalidad-extra.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export type CategoriaFuncionalidad =
  "integraciones" | "pagina" | "usuarios" | "datos";

export const CATEGORIA_LABEL: Record<CategoriaFuncionalidad, string> = {
  integraciones: "Integraciones",
  pagina: "Funcionalidades de página",
  usuarios: "Usuarios y cuentas",
  datos: "Automatización y datos",
};

type FuncionalidadInput = Omit<FuncionalidadExtra, "clave" | "activo"> & {
  activo?: boolean;
};

function toJson(doc: Record<string, unknown>) {
  return {
    id: String(doc._id),
    nombre: String(doc.nombre),
    descripcion: String(doc.descripcion ?? ""),
    categoria: String(doc.categoria),
    complejidad: String(doc.complejidad),
    precio: Number(doc.precio),
    activo: Boolean(doc.activo),
  };
}

export class FuncionalidadExtraService {
  /** Catálogo público: solo funcionalidades activas, agrupadas por categoría. */
  async listarActivas(): Promise<Record<string, unknown>[]> {
    logger.proceso("FuncionalidadExtraService.listarActivas");
    const docs = await FuncionalidadExtraModel.find({ activo: true })
      .sort({ categoria: 1, complejidad: 1, precio: 1 })
      .lean();
    logger.exito("FuncionalidadExtraService.listarActivas completado", {
      total: docs.length,
    });
    return docs.map((d) => toJson(d));
  }

  async listarTodas(): Promise<Record<string, unknown>[]> {
    logger.proceso("FuncionalidadExtraService.listarTodas");
    const docs = await FuncionalidadExtraModel.find()
      .sort({ categoria: 1, complejidad: 1 })
      .lean();
    return docs.map((d) => toJson(d));
  }

  async crear(data: FuncionalidadInput): Promise<Record<string, unknown>> {
    logger.proceso("FuncionalidadExtraService.crear", { nombre: data.nombre });

    const clave = slugDe(data.nombre);
    const duplicado = await FuncionalidadExtraModel.exists({ clave });
    if (duplicado) {
      logger.fracaso("FuncionalidadExtraService.crear: clave duplicada", {
        clave,
      });
      throw ApiError.conflict(
        `Ya existe una funcionalidad llamada "${data.nombre}"`,
      );
    }

    const doc = await FuncionalidadExtraModel.create({
      ...data,
      clave,
      descripcion: data.descripcion ?? "",
    });
    logger.exito("FuncionalidadExtraService.crear completado", {
      id: String(doc._id),
    });
    return toJson(doc.toObject());
  }

  async actualizar(
    id: string,
    data: Partial<FuncionalidadInput>,
  ): Promise<Record<string, unknown>> {
    logger.proceso("FuncionalidadExtraService.actualizar", { id });

    const doc = await FuncionalidadExtraModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      logger.fracaso("FuncionalidadExtraService.actualizar: no encontrada", {
        id,
      });
      throw ApiError.notFound("Funcionalidad no encontrada");
    }
    logger.exito("FuncionalidadExtraService.actualizar completado", { id });
    return toJson(doc.toObject());
  }

  async eliminar(id: string): Promise<void> {
    logger.proceso("FuncionalidadExtraService.eliminar", { id });
    const doc = await FuncionalidadExtraModel.findByIdAndDelete(id);
    if (!doc) {
      logger.fracaso("FuncionalidadExtraService.eliminar: no encontrada", {
        id,
      });
      throw ApiError.notFound("Funcionalidad no encontrada");
    }
    logger.exito("FuncionalidadExtraService.eliminar completado", { id });
  }

  /** Resuelve un set de ids a funcionalidades activas, validando duplicados e inactivas. */
  async resolverActivas(
    ids: string[],
  ): Promise<
    Array<{
      id: string;
      nombre: string;
      categoria: string;
      complejidad: string;
      precio: number;
    }>
  > {
    const unicos = [...new Set(ids)];
    const docs = await FuncionalidadExtraModel.find({
      _id: { $in: unicos },
      activo: true,
    }).lean();

    const encontrados = new Set(docs.map((d) => String(d._id)));
    const invalidos = unicos.filter((id) => !encontrados.has(id));
    if (invalidos.length > 0) {
      throw ApiError.validation(
        `Funcionalidades inválidas o inactivas: ${invalidos.join(", ")}`,
      );
    }

    return docs.map((d) => ({
      id: String(d._id),
      nombre: d.nombre,
      categoria: d.categoria,
      complejidad: d.complejidad,
      precio: d.precio,
    }));
  }
}

function slugDe(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const funcionalidadExtraService = new FuncionalidadExtraService();
