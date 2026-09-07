import { MensajeModel, Mensaje } from "../models/mensaje.model";
import { ProyectoModel } from "../models/proyecto.model";
import { EspacioModel } from "../models/espacio.model";
import { VistaDisenoModel } from "../models/vista-diseno.model";
import { BriefingModel } from "../models/briefing.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export type ContextoChat = "proyecto" | "espacio" | "vista";

interface MensajeJson {
  id: string;
  contexto: ContextoChat;
  contextoId: string;
  autorTipo: "admin" | "cliente";
  autorId: string;
  cuerpo: string;
  archivos: Array<{
    url: string;
    publicId: string;
    nombre: string;
    mime: string;
  }>;
  createdAt: Date;
}

function toJson(doc: Record<string, unknown>): MensajeJson {
  return {
    id: String(doc._id),
    contexto: doc.contexto as ContextoChat,
    contextoId: String(doc.contextoId),
    autorTipo: doc.autorTipo as MensajeJson["autorTipo"],
    autorId: String(doc.autorId),
    cuerpo: String(doc.cuerpo),
    archivos: (doc.archivos as MensajeJson["archivos"]) ?? [],
    createdAt: doc.createdAt as Date,
  };
}

export class MensajeService {
  /**
   * Resuelve el dueño del contexto para validar que quien lee/escribe tiene
   * derecho: admin siempre; cliente solo su propio proyecto/espacio/vista.
   */
  private async verificarAcceso(
    contexto: ContextoChat,
    contextoId: string,
    rol: "admin" | "cliente",
    userId: string,
  ): Promise<void> {
    if (rol === "admin") return;

    let clienteId: string | null = null;
    if (contexto === "proyecto") {
      const p = await ProyectoModel.findById(contextoId).lean();
      clienteId = p?.clienteId ? String(p.clienteId) : null;
    } else if (contexto === "espacio") {
      const e = await EspacioModel.findById(contextoId).lean();
      clienteId = e?.clienteId ? String(e.clienteId) : null;
    } else {
      // Vista: puede ser subdoc del briefing (ctx de proyecto) o vista de plantilla.
      const diseno = await VistaDisenoModel.findById(contextoId).lean();
      if (diseno) {
        const e = await EspacioModel.findById(diseno.espacioId).lean();
        clienteId = e?.clienteId ? String(e.clienteId) : null;
      } else {
        const briefing = await BriefingModel.findOne({
          "contenido.vistas._id": contextoId,
        })
          .select("clienteId")
          .lean();
        clienteId = briefing?.clienteId ? String(briefing.clienteId) : null;
      }
    }

    if (!clienteId || clienteId !== userId) {
      logger.fracaso("MensajeService.verificarAcceso: no autorizado", {
        contexto,
        contextoId,
      });
      throw ApiError.forbidden("No tienes acceso a este chat");
    }
  }

  async listar(
    contexto: ContextoChat,
    contextoId: string,
    rol: "admin" | "cliente",
    userId: string,
  ): Promise<MensajeJson[]> {
    logger.proceso("MensajeService.listar", { contexto, contextoId });
    await this.verificarAcceso(contexto, contextoId, rol, userId);

    const docs = await MensajeModel.find({ contexto, contextoId })
      .sort({ createdAt: 1 })
      .lean();

    // Marca como leídos los vistos por este usuario (sin bloquear la lectura).
    await MensajeModel.updateMany(
      {
        _id: { $in: docs.map((d) => d._id) },
        leidoPor: { $ne: userId },
      },
      { $addToSet: { leidoPor: userId } },
    ).exec();

    return docs.map(toJson);
  }

  async enviar(
    datos: {
      contexto: ContextoChat;
      contextoId: string;
      autorTipo: "admin" | "cliente";
      autorId: string;
      cuerpo: string;
      archivos?: MensajeJson["archivos"];
    },
    necesitaAcceso: boolean,
  ): Promise<MensajeJson> {
    logger.proceso("MensajeService.enviar", {
      contexto: datos.contexto,
      contextoId: datos.contextoId,
    });

    if (necesitaAcceso) {
      const rol =
        datos.autorTipo === "admin" ? ("admin" as const) : ("cliente" as const);
      await this.verificarAcceso(
        datos.contexto,
        datos.contextoId,
        rol,
        datos.autorId,
      );
    }

    const doc = await MensajeModel.create({
      contexto: datos.contexto,
      contextoId: datos.contextoId,
      autorTipo: datos.autorTipo,
      autorId: datos.autorId,
      cuerpo: datos.cuerpo,
      archivos: datos.archivos ?? [],
      leidoPor: [datos.autorId],
    });

    // Notificación de proyecto (nivel 2): novedad del cliente → admins;
    // respuesta del equipo → el cliente dueño.
    try {
      const { notificacionService, clienteDeContexto } =
        await import("./notificacion.service");
      const clienteId = await clienteDeContexto(
        datos.contexto as "proyecto" | "espacio" | "vista",
        datos.contextoId,
      );
      if (datos.autorTipo === "cliente") {
        await notificacionService.crearAdmins({
          tipo: "proyecto",
          titulo: "El cliente escribió en el chat",
          cuerpo: datos.cuerpo.slice(0, 140),
          contexto: datos.contexto,
          contextoId: datos.contextoId,
          creadaPor: datos.autorId,
        });
      } else if (clienteId) {
        await notificacionService.crearCliente(clienteId, {
          tipo: "proyecto",
          titulo: "El equipo respondió en el chat",
          cuerpo: datos.cuerpo.slice(0, 140),
          contexto: datos.contexto,
          contextoId: datos.contextoId,
          creadaPor: datos.autorId,
        });
      }
    } catch (error) {
      logger.fracaso("MensajeService.notificaciones: no bloquea", {
        error: (error as Error).message,
      });
    }

    logger.exito("MensajeService.enviar completado", {
      mensajeId: String(doc._id),
    });
    return toJson(doc.toObject());
  }
}

export const mensajeService = new MensajeService();
export type { Mensaje };
