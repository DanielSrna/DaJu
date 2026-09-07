import { NotificacionModel, Notificacion } from "../models/notificacion.model";
import { UserModel } from "../models/user.model";
import { ProyectoModel } from "../models/proyecto.model";
import { EspacioModel } from "../models/espacio.model";
import { VistaDisenoModel } from "../models/vista-diseno.model";
import { BriefingModel } from "../models/briefing.model";
import { logger } from "../config/logger";

interface NotificacionDatos {
  tipo: "plataforma" | "proyecto";
  titulo: string;
  cuerpo?: string;
  contexto?: Notificacion["contexto"];
  contextoId?: unknown;
  creadaPor?: string | null;
}

interface NotificacionJson {
  id: string;
  tipo: "plataforma" | "proyecto";
  paraAdmin: boolean;
  titulo: string;
  cuerpo: string;
  contexto: string;
  contextoId: string | null;
  leida: boolean;
  createdAt: Date;
}

function toJson(
  doc: Record<string, unknown>,
  userId: string,
): NotificacionJson {
  const leidaPor = (doc.leidaPor as Array<unknown>) ?? [];
  return {
    id: String(doc._id),
    tipo: doc.tipo as NotificacionJson["tipo"],
    paraAdmin: Boolean(doc.paraAdmin),
    titulo: String(doc.titulo),
    cuerpo: String(doc.cuerpo ?? ""),
    contexto: String(doc.contexto ?? "proyecto"),
    contextoId: doc.contextoId ? String(doc.contextoId) : null,
    leida: leidaPor.some((x) => String(x) === userId),
    createdAt: doc.createdAt as Date,
  };
}

/** Notificaciones internas (dos niveles: plataforma y proyecto). */
export class NotificacionService {
  /** Para todos los administradores. */
  async crearAdmins(datos: NotificacionDatos): Promise<void> {
    try {
      const admins = await UserModel.find({ rol: "admin", activo: true })
        .select("_id")
        .lean();
      const docs = admins.map(() => ({
        tipo: datos.tipo,
        paraAdmin: true,
        destinatario: null,
        titulo: datos.titulo,
        cuerpo: datos.cuerpo ?? "",
        contexto: datos.contexto ?? "proyecto",
        contextoId: datos.contextoId ?? null,
        creadaPor: datos.creadaPor ?? null,
        leidaPor: [],
      }));
      if (docs.length) {
        await NotificacionModel.insertMany(docs);
      }
    } catch (error) {
      logger.fracaso("NotificacionService.crearAdmins: falló", {
        error: (error as Error).message,
      });
    }
  }

  /** Para un cliente específico. */
  async crearCliente(
    clienteId: string,
    datos: NotificacionDatos,
  ): Promise<void> {
    try {
      await NotificacionModel.create({
        tipo: datos.tipo,
        paraAdmin: false,
        destinatario: clienteId,
        titulo: datos.titulo,
        cuerpo: datos.cuerpo ?? "",
        contexto: datos.contexto ?? "proyecto",
        contextoId: datos.contextoId ?? null,
        creadaPor: datos.creadaPor ?? null,
        leidaPor: [],
      });
    } catch (error) {
      logger.fracaso("NotificacionService.crearCliente: falló", {
        error: (error as Error).message,
      });
    }
  }

  async listarMias(
    userId: string,
    rol: "admin" | "cliente",
  ): Promise<NotificacionJson[]> {
    const query =
      rol === "admin"
        ? { $or: [{ paraAdmin: true }, { destinatario: userId }] }
        : { destinatario: userId };
    const docs = await NotificacionModel.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return docs.map((d) => toJson(d, userId));
  }

  async sinLeer(userId: string, rol: "admin" | "cliente"): Promise<number> {
    const query =
      rol === "admin"
        ? {
            $or: [{ paraAdmin: true }, { destinatario: userId }],
            leidaPor: { $ne: userId },
          }
        : { destinatario: userId, leidaPor: { $ne: userId } };
    return NotificacionModel.countDocuments(query);
  }

  async marcarLeida(
    id: string,
    userId: string,
    rol: "admin" | "cliente",
  ): Promise<void> {
    const doc = await NotificacionModel.findById(id);
    if (!doc) return;
    const esAdmin = rol === "admin";
    const esSuya =
      (doc.paraAdmin && esAdmin) ||
      (!doc.paraAdmin && String(doc.destinatario) === userId);
    if (!esSuya) return;
    if (!(doc.leidaPor as Array<unknown>).some((x) => String(x) === userId)) {
      (doc.leidaPor as unknown as string[]).push(userId);
      await doc.save();
    }
  }
}

export const notificacionService = new NotificacionService();

/** Resuelve el cliente dueño de un contexto (proyecto/espacio/vista). */
export async function clienteDeContexto(
  contexto: "proyecto" | "espacio" | "vista",
  contextoId: unknown,
): Promise<string | null> {
  try {
    if (contexto === "proyecto") {
      const p = await ProyectoModel.findById(contextoId)
        .select("clienteId")
        .lean();
      return p?.clienteId ? String(p.clienteId) : null;
    }
    if (contexto === "espacio") {
      const e = await EspacioModel.findById(contextoId)
        .select("clienteId")
        .lean();
      return e?.clienteId ? String(e.clienteId) : null;
    }
    // vista: subdoc de briefing o vista de plantilla
    const v = await VistaDisenoModel.findById(contextoId)
      .select("espacioId")
      .lean();
    if (v?.espacioId) {
      const e = await EspacioModel.findById(v.espacioId)
        .select("clienteId")
        .lean();
      return e?.clienteId ? String(e.clienteId) : null;
    }
    const b = await BriefingModel.findOne({
      "contenido.vistas._id": contextoId,
    })
      .select("clienteId")
      .lean();
    return b?.clienteId ? String(b.clienteId) : null;
  } catch {
    return null;
  }
}
