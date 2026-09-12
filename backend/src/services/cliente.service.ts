import { ProyectoModel } from "../models/proyecto.model";
import { EspacioModel } from "../models/espacio.model";
import { PagoModel } from "../models/pago.model";
import { UserModel } from "../models/user.model";
import { logger } from "../config/logger";

/** Resumen del portal del cliente: qué compró y qué entornos tiene activos. */
export class ClienteService {
  async resumen(clienteId: string): Promise<{
    proyectos: Array<{
      id: string;
      nombre: string;
      slug: string;
      estado: string;
      fechaEntrega: string | null;
      progreso: number;
    }>;
    espacios: Array<{
      id: string;
      tipoProducto: string;
      productoSlug: string;
      sesiones: { total: number; usadas: number };
      estado: string;
    }>;
    pagos: Array<{
      id: string;
      tipoProducto: string;
      productoSlug: string;
      monto: number;
      moneda: string;
      cantidad: number;
      createdAt: Date;
    }>;
  }> {
    logger.proceso("ClienteService.resumen", { clienteId });

    const [proyectos, espacios, pagos] = await Promise.all([
      ProyectoModel.find({ clienteId }).sort({ createdAt: -1 }).lean(),
      EspacioModel.find({ clienteId }).sort({ createdAt: -1 }).lean(),
      PagoModel.find({ clienteId, estado: "paid" })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const estados: Record<string, string> = {
      planeacion: "Planeación (gratis)",
      recibido: "Recibido",
      diseno: "Diseño",
      desarrollo: "Desarrollo",
      despliegue: "Despliegue",
      entregado: "Entregado",
      pausado: "Pausado",
      cancelado: "Cancelado",
    };
    const progresos: Record<string, number> = {
      planeacion: 0,
      recibido: 0,
      diseno: 1,
      desarrollo: 2,
      despliegue: 2,
      entregado: 3,
    };

    return {
      proyectos: proyectos.map((p) => {
        const etapas = (p.etapas ?? []) as unknown as Array<{
          estado: string;
        }>;
        const progreso = etapas.length
          ? etapas.filter((e) => e.estado === "completada").length /
            etapas.length
          : (progresos[p.estado] ?? 0) / 3;
        return {
          id: String(p._id),
          nombre: p.paquete?.nombre ?? "Proyecto",
          slug: p.paquete?.slug ?? "",
          estado: estados[p.estado] ?? p.estado,
          fechaEntrega: p.fechaEntrega
            ? new Date(p.fechaEntrega).toISOString()
            : null,
          progreso,
        };
      }),
      espacios: espacios.map((e) => ({
        id: String(e._id),
        tipoProducto: e.tipoProducto,
        productoSlug: e.productoSlug ?? "",
        sesiones: {
          total: e.sesiones?.total ?? 1,
          usadas: e.sesiones?.usadas ?? 0,
        },
        estado: e.estado,
      })),
      pagos: pagos.map((p) => ({
        id: String(p._id),
        tipoProducto: p.tipoProducto ?? "paquete",
        productoSlug: p.productoSlug ?? p.paqueteSlug ?? "",
        monto: p.monto,
        moneda: p.moneda ?? "USD",
        cantidad: p.cantidad ?? 1,
        createdAt: p.createdAt,
      })),
    };
  }

  /** Vista de administrador: TODOS los entornos de todos los clientes. */
  async resumenAdmin(): Promise<{
    proyectos: Array<{
      id: string;
      clienteId: string;
      clienteNombre: string;
      nombre: string;
      slug: string;
      estado: string;
      fechaEntrega: string | null;
      progreso: number;
    }>;
    espacios: Array<{
      id: string;
      clienteId: string;
      clienteNombre: string;
      tipoProducto: string;
      productoSlug: string;
      sesiones: { total: number; usadas: number };
      estado: string;
    }>;
  }> {
    logger.proceso("ClienteService.resumenAdmin");

    const [proyectos, espacios] = await Promise.all([
      ProyectoModel.find().sort({ createdAt: -1 }).lean(),
      EspacioModel.find().sort({ createdAt: -1 }).lean(),
    ]);

    const ids = new Set<string>();
    for (const p of proyectos) ids.add(String(p.clienteId));
    for (const e of espacios) ids.add(String(e.clienteId));
    const usuarios = await UserModel.find({ _id: { $in: [...ids] } })
      .select("_id nombre")
      .lean();
    const nombres = new Map(
      usuarios.map((u) => [String(u._id), u.nombre ?? "Cliente"]),
    );

    return {
      proyectos: proyectos.map((p) => ({
        id: String(p._id),
        clienteId: String(p.clienteId ?? ""),
        clienteNombre: nombres.get(String(p.clienteId)) ?? "Cliente",
        nombre: p.paquete?.nombre ?? "Proyecto",
        slug: p.paquete?.slug ?? "",
        estado: p.estado,
        fechaEntrega: p.fechaEntrega
          ? new Date(p.fechaEntrega).toISOString()
          : null,
        progreso:
          (
            { recibido: 0, diseno: 1, desarrollo: 2, entregado: 3 } as Record<
              string,
              number
            >
          )[p.estado] ?? 0,
      })),
      espacios: espacios.map((e) => ({
        id: String(e._id),
        clienteId: String(e.clienteId ?? ""),
        clienteNombre: nombres.get(String(e.clienteId)) ?? "Cliente",
        tipoProducto: e.tipoProducto,
        productoSlug: e.productoSlug ?? "",
        sesiones: {
          total: e.sesiones?.total ?? 1,
          usadas: e.sesiones?.usadas ?? 0,
        },
        estado: e.estado,
      })),
    };
  }

  /** Métricas rápidas para el portal de administrador (los 3 tipos). */
  async metricas(): Promise<{
    ingresosMes: number;
    pagosMes: number;
    proyectosActivos: number;
    entornosPlantillas: number;
    entornosServicios: number;
    sesionesPendientes: number;
    citasPorConfirmar: number;
    solicitudesAbiertas: number;
  }> {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const [
      pagosMes,
      countActivos,
      entornosPlantillas,
      entornosServicios,
      sesionesPendientes,
      citasPorConfirmar,
      solicitudesAbiertas,
    ] = await Promise.all([
      PagoModel.find({ estado: "paid", createdAt: { $gte: inicioMes } })
        .select("monto")
        .lean(),
      (async () => {
        const { ProyectoModel: M } = await import("../models/proyecto.model");
        return M.countDocuments({ estado: { $ne: "entregado" } });
      })(),
      EspacioModel.countDocuments({
        tipoProducto: "plantilla",
        estado: "activo",
      }),
      EspacioModel.countDocuments({
        tipoProducto: "servicio",
        estado: "activo",
      }),
      (async () => {
        const espacios = await EspacioModel.find({
          tipoProducto: "servicio",
          estado: "activo",
        })
          .select("sesiones")
          .lean();
        return espacios.reduce(
          (suma, e) =>
            suma +
            Math.max(0, (e.sesiones?.total ?? 0) - (e.sesiones?.usadas ?? 0)),
          0,
        );
      })(),
      (async () => {
        const { CitaModel } = await import("../models/cita.model");
        return CitaModel.countDocuments({ estado: "propuesta" });
      })(),
      (async () => {
        const { SolicitudFuncionModel } =
          await import("../models/solicitud-funcion.model");
        return SolicitudFuncionModel.countDocuments({ estado: "abierta" });
      })(),
    ]);
    return {
      ingresosMes: pagosMes.reduce((suma, p) => suma + (p.monto ?? 0), 0),
      pagosMes: pagosMes.length,
      proyectosActivos: countActivos,
      entornosPlantillas,
      entornosServicios,
      sesionesPendientes,
      citasPorConfirmar: citasPorConfirmar,
      solicitudesAbiertas: solicitudesAbiertas,
    };
  }
}

export const clienteService = new ClienteService();
