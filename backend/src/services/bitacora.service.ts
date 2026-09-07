import { BitacoraModel, Bitacora } from "../models/bitacora.model";
import { logger } from "../config/logger";

interface Entrada {
  proyectoId: string;
  tipo: Bitacora["tipo"];
  mensaje: string;
  creadaPor?: string | null;
  usuarioNombre?: string;
}

/** Registro de actividad del proyecto. Nunca bloquea el flujo principal. */
export class BitacoraService {
  async registrar(datos: Entrada): Promise<void> {
    logger.proceso("BitacoraService.registrar", {
      proyectoId: datos.proyectoId,
    });
    try {
      await BitacoraModel.create({
        proyectoId: datos.proyectoId,
        tipo: datos.tipo,
        mensaje: datos.mensaje,
        creadaPor: datos.creadaPor ?? null,
        usuarioNombre: datos.usuarioNombre ?? "",
      });
    } catch (error) {
      logger.fracaso("BitacoraService.registrar: falló", {
        error: (error as Error).message,
      });
    }
  }

  async listar(proyectoId: string): Promise<
    Array<{
      id: string;
      tipo: string;
      mensaje: string;
      usuarioNombre: string;
      createdAt: Date;
    }>
  > {
    const docs = await BitacoraModel.find({ proyectoId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      tipo: d.tipo,
      mensaje: d.mensaje,
      usuarioNombre: d.usuarioNombre ?? "",
      createdAt: d.createdAt,
    }));
  }
}

export const bitacoraService = new BitacoraService();
