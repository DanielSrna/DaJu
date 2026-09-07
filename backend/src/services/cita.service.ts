import { CitaModel, Cita } from "../models/cita.model";
import { EspacioModel } from "../models/espacio.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

interface CitaJson {
  id: string;
  espacioId: string;
  sesion: number;
  propuestas: Date[];
  confirmada: Date | null;
  duracionMin: number;
  canal: "Meet" | "Zoom";
  estado: Cita["estado"];
  linkVideollamada: string;
  notas: string;
  createdAt: Date;
}

function toJson(doc: Record<string, unknown>): CitaJson {
  return {
    id: String(doc._id),
    espacioId: String(doc.espacioId),
    sesion: Number(doc.sesion),
    propuestas: (doc.propuestas as Date[]) ?? [],
    confirmada: (doc.confirmada as Date | null) ?? null,
    duracionMin: Number(doc.duracionMin ?? 60),
    canal: (doc.canal as CitaJson["canal"]) ?? "Meet",
    estado: doc.estado as Cita["estado"],
    linkVideollamada: String(doc.linkVideollamada ?? ""),
    notas: String(doc.notas ?? ""),
    createdAt: doc.createdAt as Date,
  };
}

export class CitaService {
  private async espacioPropio(
    espacioId: string,
    clienteId: string,
  ): Promise<void> {
    const espacio = await EspacioModel.findOne({ _id: espacioId, clienteId });
    if (!espacio) throw ApiError.notFound("Espacio no encontrado");
  }

  async listar(espacioId: string, clienteId?: string): Promise<CitaJson[]> {
    logger.proceso("CitaService.listar", { espacioId });
    if (clienteId) await this.espacioPropio(espacioId, clienteId);
    const docs = await CitaModel.find({ espacioId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toJson);
  }

  /** El cliente propone una cita; consume una de sus sesiones si está confirmada. */
  async proponer(
    espacioId: string,
    clienteId: string,
    datos: {
      propuestas: Date[];
      duracionMin: number;
      canal: "Meet" | "Zoom";
    },
  ): Promise<CitaJson> {
    logger.proceso("CitaService.proponer", { espacioId });
    const espacio = await EspacioModel.findOne({ _id: espacioId, clienteId });
    if (!espacio) throw ApiError.notFound("Espacio no encontrado");

    const total = espacio.sesiones?.total ?? 1;
    const usadas = espacio.sesiones?.usadas ?? 0;
    if (usadas + 1 > total) {
      throw ApiError.validation(
        "No quedan sesiones disponibles en este espacio",
      );
    }

    for (const franja of datos.propuestas) {
      const ocupada = await CitaModel.findOne({
        estado: "confirmada",
        confirmada: franja,
      });
      if (ocupada) {
        throw ApiError.validation(
          "Una de las franjas propuestas ya está confirmada por otra cita",
        );
      }
    }

    const doc = await CitaModel.create({
      espacioId,
      sesion: usadas + 1,
      propuestas: datos.propuestas,
      duracionMin: datos.duracionMin,
      canal: datos.canal,
      estado: "propuesta",
    });

    try {
      const { notificacionService } = await import("./notificacion.service");
      await notificacionService.crearAdmins({
        tipo: "proyecto",
        titulo: "El cliente propuso una cita",
        cuerpo: `Sesión ${doc.sesion} por ${datos.canal}`,
        contexto: "cita",
        contextoId: doc._id,
        creadaPor: clienteId,
      });
    } catch (error) {
      logger.fracaso("CitaService.proponer: notificación falló", {
        error: (error as Error).message,
      });
    }
    logger.exito("CitaService.proponer completado", {
      citaId: String(doc._id),
    });
    return toJson(doc.toObject());
  }

  /** Admin confirma una de las franjas propuestas (con link de la videollamada). */
  async confirmar(
    citaId: string,
    adminId: string,
    franja: Date | null,
    linkVideollamada = "",
  ): Promise<CitaJson> {
    logger.proceso("CitaService.confirmar", { citaId });
    const doc = await CitaModel.findById(citaId);
    if (!doc) throw ApiError.notFound("Cita no encontrada");
    if (doc.estado !== "propuesta") {
      throw ApiError.validation(
        "Solo se puede confirmar una cita en propuesta",
      );
    }

    if (!franja)
      throw ApiError.validation("Debes elegir una franja para confirmar");
    const propuestas = doc.propuestas as unknown as Date[];
    const valida = propuestas.some(
      (f) => new Date(f).getTime() === new Date(franja).getTime(),
    );
    if (!valida) {
      throw ApiError.validation(
        "La franja confirmada debe ser una de las propuestas",
      );
    }

    // Concurrencia: nadie más puede tener confirmada la misma franja.
    const ocupada = await CitaModel.findOne({
      _id: { $ne: doc._id },
      estado: "confirmada",
      confirmada: franja,
    });
    if (ocupada) {
      throw ApiError.validation(
        "La franja ya está confirmada por otra cita; elige otra",
      );
    }

    doc.confirmada = franja;
    doc.estado = "confirmada";
    doc.linkVideollamada = linkVideollamada;
    (doc as unknown as { confirmadaPor: string }).confirmadaPor = adminId;
    await doc.save();

    try {
      const { notificacionService } = await import("./notificacion.service");
      const e = await EspacioModel.findById(doc.espacioId)
        .select("clienteId")
        .lean();
      if (e?.clienteId) {
        await notificacionService.crearCliente(String(e.clienteId), {
          tipo: "proyecto",
          titulo: "Tu cita fue confirmada",
          cuerpo: `Sesión ${doc.sesion} · ${franja.toLocaleString("es-CO")}`,
          contexto: "cita",
          contextoId: doc._id,
          creadaPor: adminId,
        });
      }
    } catch (error) {
      logger.fracaso("CitaService: notificación falló", {
        error: (error as Error).message,
      });
    }
    // Email de confirmación al cliente (si la infra de correo lo permite).
    try {
      const { notificacionesService } =
        await import("./notificaciones.service");
      const e = await EspacioModel.findById(doc.espacioId)
        .select("clienteId")
        .lean();
      const usuario = e?.clienteId
        ? await import("./../models/user.model").then((m) =>
            m.UserModel.findById(e.clienteId).select("email nombre").lean(),
          )
        : null;
      if (usuario?.email) {
        await notificacionesService.enviarCitaConfirmada({
          email: usuario.email,
          cliente: usuario.nombre ?? "cliente",
          sesion: doc.sesion,
          fecha: new Date(franja).toLocaleString("es-CO", {
            dateStyle: "long",
            timeStyle: "short",
          }),
          canal: doc.canal,
          linkVideollamada: linkVideollamada,
        });
      }
    } catch (error) {
      logger.fracaso("CitaService.confirmar: notificación falló", {
        error: (error as Error).message,
      });
    }
    logger.exito("CitaService.confirmar completado", { citaId });
    return toJson(doc.toObject());
  }

  /** Admin marca la cita realizada: consume una sesión del espacio. */
  async realizar(citaId: string): Promise<CitaJson> {
    logger.proceso("CitaService.realizar", { citaId });
    const doc = await CitaModel.findById(citaId);
    if (!doc) throw ApiError.notFound("Cita no encontrada");
    if (doc.estado !== "confirmada") {
      throw ApiError.validation(
        "Solo se puede realizar una cita ya confirmada",
      );
    }

    const espacio = await EspacioModel.findById(doc.espacioId);
    if (!espacio) throw ApiError.notFound("Espacio no encontrado");
    const total = espacio.sesiones?.total ?? 1;
    const usadas = espacio.sesiones?.usadas ?? 0;
    if (usadas + 1 > total) {
      throw ApiError.validation("Se agotaron las sesiones compradas");
    }
    espacio.sesiones = { total, usadas: usadas + 1 };
    await espacio.save();

    doc.estado = "realizada";
    await doc.save();

    try {
      const { notificacionService } = await import("./notificacion.service");
      const e = await EspacioModel.findById(doc.espacioId)
        .select("clienteId")
        .lean();
      if (e?.clienteId) {
        await notificacionService.crearCliente(String(e.clienteId), {
          tipo: "proyecto",
          titulo: "Sesión realizada",
          cuerpo: `Sesión ${doc.sesion} completada.`,
          contexto: "cita",
          contextoId: doc._id,
        });
      }
    } catch (error) {
      logger.fracaso("CitaService.realizar: notificación falló", {
        error: (error as Error).message,
      });
    }
    logger.exito("CitaService.realizar completado", { citaId });
    return toJson(doc.toObject());
  }

  /** Cancela (propuesta o confirmada): no consume sesión. Dueño o admin. */
  async cancelar(citaId: string, clienteId?: string): Promise<CitaJson> {
    logger.proceso("CitaService.cancelar", { citaId });
    const doc = await CitaModel.findById(citaId);
    if (!doc) throw ApiError.notFound("Cita no encontrada");
    if (clienteId) {
      const espacio = await EspacioModel.findOne({
        _id: doc.espacioId,
        clienteId,
      });
      if (!espacio) throw ApiError.forbidden("No tienes acceso a esta cita");
    }
    if (doc.estado === "realizada") {
      throw ApiError.validation("No se puede cancelar una cita realizada");
    }
    doc.estado = "cancelada";
    await doc.save();
    logger.exito("CitaService.cancelar completado", { citaId });
    return toJson(doc.toObject());
  }
}

export const citaService = new CitaService();
