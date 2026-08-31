import {
  CapacidadConfigModel,
  TipoPaquete,
} from "../models/capacidad-config.model";
import { ProyectoModel } from "../models/proyecto.model";
import { addBusinessDays } from "../utils/fechas";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

const RANGO_AJUSTE = { min: -15, max: 30 } as const;
const ESTADOS_RECALCULABLES = ["recibido", "diseno", "desarrollo"] as const;

/**
 * Gestor de capacidad: válvula interna que suma/resta días hábiles
 * a los paquetes públicos y recalcula las entregas pendientes.
 */
export class CapacidadService {
  async obtenerConfig() {
    logger.proceso("CapacidadService.obtenerConfig");
    const config = await this.getOrCreate();
    logger.exito("CapacidadService.obtenerConfig completado");
    return { ajustes: config.ajustes };
  }

  async actualizarAjustes(ajustes: Partial<Record<TipoPaquete, number>>) {
    logger.proceso("CapacidadService.actualizarAjustes", { ajustes });

    for (const [tipo, dias] of Object.entries(ajustes)) {
      const cantidad = Number(dias);
      if (!Number.isInteger(cantidad)) {
        throw ApiError.validation(
          `El ajuste de "${tipo}" debe ser un número entero`,
        );
      }
      if (cantidad < RANGO_AJUSTE.min || cantidad > RANGO_AJUSTE.max) {
        throw ApiError.validation(
          `El ajuste de "${tipo}" debe estar entre ${RANGO_AJUSTE.min} y ${RANGO_AJUSTE.max} días`,
        );
      }
    }

    const config = await this.getOrCreate();
    config.ajustes = {
      validor: ajustes.validor ?? config.ajustes?.validor ?? 0,
      corporativo: ajustes.corporativo ?? config.ajustes?.corporativo ?? 0,
      operativo: ajustes.operativo ?? config.ajustes?.operativo ?? 0,
    };
    await config.save();

    const proyectosRecalculados = await this.recalcularFechasPendientes();
    logger.exito("CapacidadService.actualizarAjustes completado", {
      ajustes: config.ajustes,
      proyectosRecalculados,
    });
    return { ajustes: config.ajustes, proyectosRecalculados };
  }

  /** Días hábiles efectivos para un paquete: base + ajuste de capacidad. */
  async getDiasEfectivos(tipo: TipoPaquete, diasBase: number): Promise<number> {
    const config = await this.getOrCreate();
    const efectivos = diasBase + (config.ajustes?.[tipo] ?? 0);
    return Math.max(1, efectivos);
  }

  /** Recalcula la fecha de entrega de proyectos pendientes con los ajustes vigentes. */
  async recalcularFechasPendientes(): Promise<number> {
    logger.proceso("CapacidadService.recalcularFechasPendientes");
    const config = await this.getOrCreate();

    const proyectos = await ProyectoModel.find({
      estado: { $in: [...ESTADOS_RECALCULABLES] },
    });

    let actualizados = 0;
    for (const proyecto of proyectos) {
      const paquete = proyecto.paquete;
      if (!paquete) continue;
      const efectivos = Math.max(
        1,
        paquete.diasEntrega + (config.ajustes?.[paquete.tipo] ?? 0),
      );
      proyecto.fechaEntrega = addBusinessDays(proyecto.fechaCompra, efectivos);
      await proyecto.save();
      actualizados += 1;
    }

    logger.exito("CapacidadService.recalcularFechasPendientes completado", {
      actualizados,
    });
    return actualizados;
  }

  /**
   * Singleton de configuración: busca el documento o lo crea con valores
   * por defecto (upsert atómico, evita carreras de inicialización).
   */
  private async getOrCreate() {
    return CapacidadConfigModel.findOneAndUpdate(
      {},
      {
        $setOnInsert: { ajustes: { validor: 0, corporativo: 0, operativo: 0 } },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        sort: { createdAt: 1 },
      },
    );
  }
}

export const capacidadService = new CapacidadService();
