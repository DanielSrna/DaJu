import { SolicitudFuncionModel } from "../models/solicitud-funcion.model";
import { EspacioModel } from "../models/espacio.model";
import { ProyectoModel } from "../models/proyecto.model";
import { BriefingModel } from "../models/briefing.model";
import { VistaDisenoModel } from "../models/vista-diseno.model";
import { UserModel } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

interface SolicitudJson {
  id: string;
  espacioId: string;
  proyectoId: string;
  titulo: string;
  descripcion: string;
  estado: "abierta" | "respondida" | "aceptada" | "pagada";
  costo: number;
  costoSugerido: number;
  origen: "personalizada" | "catalogo";
  catalogoClave: string;
  respuestaAdmin: string;
  createdAt: Date;
}

function toJson(doc: Record<string, unknown>): SolicitudJson {
  return {
    id: String(doc._id),
    espacioId: doc.espacioId ? String(doc.espacioId) : "",
    proyectoId: doc.proyectoId ? String(doc.proyectoId) : "",
    titulo: String(doc.titulo),
    descripcion: String(doc.descripcion),
    estado: (doc.estado as SolicitudJson["estado"]) ?? "abierta",
    costo: Number(doc.costo ?? 0),
    costoSugerido: Number(doc.costoSugerido ?? 0),
    origen: (doc.origen as SolicitudJson["origen"]) ?? "personalizada",
    catalogoClave: String(doc.catalogoClave ?? ""),
    respuestaAdmin: String(doc.respuestaAdmin ?? ""),
    createdAt: doc.createdAt as Date,
  };
}

interface Filtro {
  espacioId?: string;
  proyectoId?: string;
}

/** Unifica la validación de propiedad (mismo patrón para espacio y proyecto). */
async function verificarPropietario(
  filtro: Filtro,
  clienteId: string,
): Promise<void> {
  if (filtro.espacioId) {
    const espacio = await EspacioModel.findOne({
      _id: filtro.espacioId,
      clienteId,
    });
    if (!espacio) throw ApiError.notFound("Espacio no encontrado");
    return;
  }
  if (filtro.proyectoId) {
    const proyecto = await ProyectoModel.findOne({
      _id: filtro.proyectoId,
      clienteId,
    });
    if (!proyecto) throw ApiError.notFound("Proyecto no encontrado");
    return;
  }
  throw ApiError.validation("Falta el contexto de la solicitud");
}

export class SolicitudFuncionService {
  async listar(filtro: Filtro, clienteId?: string): Promise<SolicitudJson[]> {
    logger.proceso("SolicitudFuncionService.listar", { filtro });
    if (clienteId) await verificarPropietario(filtro, clienteId);
    const docs = await SolicitudFuncionModel.find(filtro)
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toJson);
  }

  async crear(
    filtro: Filtro,
    clienteId: string,
    datos: {
      titulo: string;
      descripcion: string;
      costoSugerido?: number;
      origen?: "personalizada" | "catalogo";
      catalogoClave?: string;
    },
  ): Promise<SolicitudJson> {
    logger.proceso("SolicitudFuncionService.crear", { filtro });
    await verificarPropietario(filtro, clienteId);

    const doc = await SolicitudFuncionModel.create({
      espacioId: filtro.espacioId ?? null,
      proyectoId: filtro.proyectoId ?? null,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      estado: "abierta",
      costo: 0,
      costoSugerido: datos.costoSugerido ?? 0,
      origen: datos.origen ?? "personalizada",
      catalogoClave: datos.catalogoClave ?? "",
      respuestaAdmin: "",
    });
    try {
      const { notificacionService } = await import("./notificacion.service");
      await notificacionService.crearAdmins({
        tipo: "proyecto",
        titulo: "Nueva función solicitada",
        cuerpo: datos.titulo,
        contexto: "solicitud",
        contextoId: doc._id,
        creadaPor: clienteId,
      });
    } catch (error) {
      logger.fracaso("SolicitudFuncionService.crear: notificación falló", {
        error: (error as Error).message,
      });
    }
    logger.exito("SolicitudFuncionService.crear completado", {
      solicitudId: String(doc._id),
    });
    return toJson(doc.toObject());
  }

  /** Admin responde con costo propuesto (la vista pasa a "En cotización"). */
  async responder(
    solicitudId: string,
    adminId: string,
    datos: { costo: number; respuestaAdmin: string },
  ): Promise<SolicitudJson> {
    logger.proceso("SolicitudFuncionService.responder", { solicitudId });
    const doc = await SolicitudFuncionModel.findByIdAndUpdate(
      solicitudId,
      {
        costo: datos.costo,
        respuestaAdmin: datos.respuestaAdmin,
        estado: "respondida",
        respondidaPor: adminId,
      },
      { new: true, runValidators: true },
    );
    if (!doc) throw ApiError.notFound("Solicitud no encontrada");

    // La vista/función pasa a "En cotización": briefing (paquete) o VistaDiseno (plantilla).
    if (!doc.proyectoId && doc.espacioId) {
      const vista = await VistaDisenoModel.findOne({
        espacioId: doc.espacioId,
        nombre: doc.titulo,
      });
      if (vista && vista.estado !== "aprobada") {
        vista.estado = "cotizacion";
        await vista.save();
      }
    }
    if (doc.proyectoId) {
      const briefing = await BriefingModel.findOne({
        proyectoId: doc.proyectoId,
        "contenido.vistas.nombre": doc.titulo,
      });
      if (briefing) {
        const lista = (briefing.contenido?.vistas ?? []) as unknown as Array<{
          nombre?: string;
          semaforo?: string;
        }>;
        const vista = lista.find((v) => v.nombre === doc.titulo);
        if (vista && vista.semaforo !== "aprobada") {
          vista.semaforo = "cotizacion";
          briefing.markModified("contenido.vistas");
          await briefing.save();
        }
      }
    }

    try {
      const { notificacionService } = await import("./notificacion.service");
      const clienteId = doc.proyectoId
        ? String(
            (
              await ProyectoModel.findById(doc.proyectoId)
                .select("clienteId")
                .lean()
            )?.clienteId ?? "",
          )
        : String(
            (
              await EspacioModel.findById(doc.espacioId)
                .select("clienteId")
                .lean()
            )?.clienteId ?? "",
          );
      if (clienteId && clienteId !== "undefined") {
        await notificacionService.crearCliente(clienteId, {
          tipo: "proyecto",
          titulo: "Cotización de tu función",
          cuerpo: `${doc.titulo} · $${datos.costo} USD`,
          contexto: "solicitud",
          contextoId: doc._id,
          creadaPor: adminId,
        });
      }
    } catch (error) {
      logger.fracaso("SolicitudFuncionService: notificación falló", {
        error: (error as Error).message,
      });
    }
    // Email de cotización al cliente.
    try {
      const { notificacionesService } =
        await import("./notificaciones.service");
      const clienteId = doc.proyectoId
        ? String(
            (
              await ProyectoModel.findById(doc.proyectoId)
                .select("clienteId")
                .lean()
            )?.clienteId ?? "",
          )
        : String(
            (
              await EspacioModel.findById(doc.espacioId)
                .select("clienteId")
                .lean()
            )?.clienteId ?? "",
          );
      const usuario =
        clienteId && clienteId !== "undefined"
          ? await UserModel.findById(clienteId).select("email nombre").lean()
          : null;
      if (usuario?.email) {
        await notificacionesService.enviarCotizacionRespondida({
          email: usuario.email,
          cliente: usuario.nombre ?? "cliente",
          titulo: doc.titulo,
          costo: datos.costo,
          respuesta: datos.respuestaAdmin,
        });
      }
    } catch (error) {
      logger.fracaso("SolicitudFuncionService.responder: notificación falló", {
        error: (error as Error).message,
      });
    }
    logger.exito("SolicitudFuncionService.responder completado", {
      solicitudId,
    });
    return toJson(doc.toObject());
  }
}

export const solicitudFuncionService = new SolicitudFuncionService();
