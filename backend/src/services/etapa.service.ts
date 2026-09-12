import { ProyectoModel } from "../models/proyecto.model";
import { EspacioModel } from "../models/espacio.model";
import { Etapa } from "../models/etapa.schema";
import { pagoService } from "./pago.service";
import type { PagoJson } from "./pago.service";
import { bitacoraService } from "./bitacora.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export type FamiliaEntorno = "proyecto" | "espacio";

export interface EtapaInput {
  nombre: string;
  descripcion?: string;
  monto?: number;
  requierePago?: boolean;
}

const MAX_ETAPAS = 12;

/** La primera etapa (sin cobro) es siempre la fase de planeación gratis. */
function esEtapaPlaneacion(etapa: Etapa): boolean {
  return !etapa.requierePago && etapa.orden === 1;
}

interface ContenedorEtapas {
  _id: unknown;
  etapas: unknown;
  save(): Promise<unknown>;
  markModified(path: string): void;
}

/**
 * Plan de etapas libre de un proyecto o espacio (barra de progreso).
 * El admin define las etapas y las desbloquea al confirmar cada pago.
 */
export class EtapaService {
  async agregar(
    familia: FamiliaEntorno,
    id: string,
    data: EtapaInput,
    adminId: string,
  ): Promise<Etapa[]> {
    logger.proceso("EtapaService.agregar", { familia, id });
    const { doc, etapas } = await this.cargar(familia, id);
    if (etapas.length >= MAX_ETAPAS) {
      throw ApiError.validation(`Máximo ${MAX_ETAPAS} etapas por proyecto`);
    }
    const requierePago = data.requierePago ?? (data.monto ?? 0) > 0;
    const orden = etapas.length
      ? Math.max(...etapas.map((e) => e.orden)) + 1
      : 1;
    etapas.push({
      nombre: data.nombre,
      descripcion: data.descripcion ?? "",
      orden,
      monto: requierePago ? (data.monto ?? 0) : 0,
      requierePago,
      pagoEstado: requierePago ? "pendiente" : "no_requerido",
      estado: requierePago ? "bloqueada" : "en_curso",
    } as never);
    doc.markModified("etapas");
    await doc.save();
    await this.bitacora(
      familia,
      id,
      adminId,
      `Etapa "${data.nombre}" agregada`,
    );
    logger.exito("EtapaService.agregar completado", { id });
    return etapas;
  }

  async actualizar(
    familia: FamiliaEntorno,
    id: string,
    etapaId: string,
    data: Partial<EtapaInput>,
    adminId: string,
  ): Promise<Etapa[]> {
    logger.proceso("EtapaService.actualizar", { familia, id, etapaId });
    const { doc, etapas } = await this.cargar(familia, id);
    const etapa = this.buscar(etapas, etapaId);
    const congelado =
      etapa.pagoEstado === "solicitado" || etapa.pagoEstado === "pagado";

    if (typeof data.nombre === "string") etapa.nombre = data.nombre;
    if (typeof data.descripcion === "string") {
      etapa.descripcion = data.descripcion;
    }
    if (
      typeof data.monto === "number" ||
      typeof data.requierePago === "boolean"
    ) {
      if (congelado) {
        throw ApiError.conflict(
          "No se puede cambiar el cobro de una etapa con pago en curso o pagada",
        );
      }
      if (
        esEtapaPlaneacion(etapa) &&
        (data.requierePago === true || (data.monto ?? 0) > 0)
      ) {
        throw ApiError.conflict(
          "La etapa de planeación y diseño siempre es gratis",
        );
      }
      const requierePago = data.requierePago ?? etapa.requierePago;
      etapa.requierePago = requierePago;
      etapa.monto = requierePago ? (data.monto ?? etapa.monto) : 0;
      etapa.pagoEstado = requierePago
        ? etapa.pagoEstado === "no_requerido"
          ? "pendiente"
          : etapa.pagoEstado
        : "no_requerido";
      if (!requierePago && etapa.estado === "bloqueada") {
        etapa.estado = "en_curso";
      }
    }
    doc.markModified("etapas");
    await doc.save();
    await this.bitacora(
      familia,
      id,
      adminId,
      `Etapa "${etapa.nombre}" actualizada`,
    );
    return etapas;
  }

  async eliminar(
    familia: FamiliaEntorno,
    id: string,
    etapaId: string,
    adminId: string,
  ): Promise<Etapa[]> {
    logger.proceso("EtapaService.eliminar", { familia, id, etapaId });
    const { doc, etapas } = await this.cargar(familia, id);
    const etapa = this.buscar(etapas, etapaId);
    if (etapa.pagoEstado === "pagado") {
      throw ApiError.conflict("No se puede eliminar una etapa ya pagada");
    }
    if (esEtapaPlaneacion(etapa)) {
      throw ApiError.conflict(
        "La etapa de planeación y diseño no se puede eliminar",
      );
    }
    const indice = etapas.findIndex((e) => String(e._id) === etapaId);
    etapas.splice(indice, 1);
    doc.markModified("etapas");
    await doc.save();
    await this.bitacora(
      familia,
      id,
      adminId,
      `Etapa "${etapa.nombre}" eliminada`,
    );
    return etapas;
  }

  /** Reordena según la lista de ids (debe incluir todas las etapas). */
  async reordenar(
    familia: FamiliaEntorno,
    id: string,
    orden: string[],
    adminId: string,
  ): Promise<Etapa[]> {
    logger.proceso("EtapaService.reordenar", { familia, id });
    const { doc, etapas } = await this.cargar(familia, id);
    if (orden.length !== etapas.length) {
      throw ApiError.validation("El orden debe incluir todas las etapas");
    }
    const porId = new Map(etapas.map((e) => [String(e._id), e]));
    const planeacion = etapas.find((e) => esEtapaPlaneacion(e));
    if (planeacion && orden[0] !== String(planeacion._id)) {
      throw ApiError.validation(
        "La etapa de planeación y diseño siempre va primero",
      );
    }
    orden.forEach((etapaId, indice) => {
      const etapa = porId.get(etapaId);
      if (!etapa) throw ApiError.validation(`Etapa inválida: ${etapaId}`);
      etapa.orden = indice + 1;
    });
    doc.markModified("etapas");
    await doc.save();
    await this.bitacora(familia, id, adminId, "Etapas reordenadas");
    return etapas;
  }

  /**
   * Cambia el estado de trabajo de una etapa.
   * - completada: exige pago confirmado si la etapa lo requiere.
   * - en_curso: desbloqueo manual del admin (override con bitácora).
   */
  async cambiarEstado(
    familia: FamiliaEntorno,
    id: string,
    etapaId: string,
    estado: "en_curso" | "completada",
    adminId: string,
  ): Promise<Etapa[]> {
    logger.proceso("EtapaService.cambiarEstado", {
      familia,
      id,
      etapaId,
      estado,
    });
    const { doc, etapas } = await this.cargar(familia, id);
    const etapa = this.buscar(etapas, etapaId);
    if (etapa.estado === "completada") {
      throw ApiError.conflict("La etapa ya está completada");
    }
    if (
      estado === "completada" &&
      etapa.requierePago &&
      etapa.pagoEstado !== "pagado"
    ) {
      throw ApiError.validation(
        "Primero confirma el pago de esta etapa para completarla",
      );
    }
    const desbloqueoManual =
      estado === "en_curso" &&
      etapa.requierePago &&
      etapa.pagoEstado !== "pagado";
    etapa.estado = estado;
    if (estado === "completada") {
      etapa.completadaEn = new Date();
      etapa.completadaPor = adminId as never;
    }
    doc.markModified("etapas");
    await doc.save();
    await this.bitacora(
      familia,
      id,
      adminId,
      desbloqueoManual
        ? `Etapa "${etapa.nombre}" desbloqueada manualmente (sin pago)`
        : `Etapa "${etapa.nombre}" marcada como ${estado}`,
    );
    return etapas;
  }

  /** Habilita el cobro de una etapa (crea el pago con código único). */
  async solicitarPago(
    familia: FamiliaEntorno,
    id: string,
    etapaId: string,
    adminId: string,
  ): Promise<PagoJson> {
    logger.proceso("EtapaService.solicitarPago", { familia, id, etapaId });
    const { etapas } = await this.cargar(familia, id);
    const etapa = this.buscar(etapas, etapaId);
    if (!etapa.requierePago || etapa.monto <= 0) {
      throw ApiError.validation("Esta etapa no tiene un cobro definido");
    }
    if (etapa.pagoEstado === "pagado") {
      throw ApiError.conflict("Esta etapa ya está pagada");
    }
    return pagoService.solicitarPago(
      {
        ...(familia === "proyecto" ? { proyectoId: id } : { espacioId: id }),
        etapaId,
        tipoPago: "etapa",
        monto: etapa.monto,
        descripcion: `Etapa: ${etapa.nombre}`,
      },
      adminId,
    );
  }

  private async cargar(
    familia: FamiliaEntorno,
    id: string,
  ): Promise<{ doc: ContenedorEtapas; etapas: Etapa[] }> {
    const doc =
      familia === "proyecto"
        ? await ProyectoModel.findById(id)
        : await EspacioModel.findById(id);
    if (!doc) {
      throw ApiError.notFound(
        familia === "proyecto"
          ? "Proyecto no encontrado"
          : "Espacio no encontrado",
      );
    }
    return {
      doc: doc as unknown as ContenedorEtapas,
      etapas: (doc.etapas ?? []) as unknown as Etapa[],
    };
  }

  private buscar(etapas: Etapa[], etapaId: string): Etapa {
    const etapa = etapas.find((e) => String(e._id) === etapaId);
    if (!etapa) throw ApiError.notFound("Etapa no encontrada");
    return etapa;
  }

  private async bitacora(
    familia: FamiliaEntorno,
    id: string,
    adminId: string,
    mensaje: string,
  ): Promise<void> {
    if (familia !== "proyecto") return;
    try {
      await bitacoraService.registrar({
        proyectoId: id,
        tipo: "estado",
        mensaje,
        creadaPor: adminId,
      });
    } catch (error) {
      logger.fracaso("EtapaService.bitacora falló", {
        error: (error as Error).message,
      });
    }
  }
}

export const etapaService = new EtapaService();
