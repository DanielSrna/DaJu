import { Schema, Types } from "mongoose";

/**
 * Etapa del plan de trabajo de un proyecto o espacio.
 * El admin las define libremente: cada etapa con costo se desbloquea
 * cuando su pago queda confirmado.
 */
export const etapaSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "", trim: true },
    orden: { type: Number, required: true, min: 0 },
    monto: { type: Number, default: 0, min: 0 },
    requierePago: { type: Boolean, default: true },
    pagoEstado: {
      type: String,
      enum: ["no_requerido", "pendiente", "solicitado", "pagado"],
      default: "pendiente",
    },
    estado: {
      type: String,
      enum: ["bloqueada", "en_curso", "completada"],
      default: "bloqueada",
      index: true,
    },
    pagoId: { type: Types.ObjectId, ref: "Pago", default: null },
    completadaEn: { type: Date, default: null },
    completadaPor: { type: Types.ObjectId, ref: "User", default: null },
  },
  { _id: true },
);

/** Etapa materializada (subdocumento de Proyecto/Espacio). */
export interface Etapa {
  _id: unknown;
  nombre: string;
  descripcion: string;
  orden: number;
  monto: number;
  requierePago: boolean;
  pagoEstado: "no_requerido" | "pendiente" | "solicitado" | "pagado";
  estado: "bloqueada" | "en_curso" | "completada";
  pagoId?: unknown;
  completadaEn?: Date | null;
  completadaPor?: unknown;
}

/** Resumen del plan para la barra de progreso (avance y dinero). */
export function resumenEtapas(etapas: Etapa[]): {
  etapasCompletadas: number;
  etapasTotal: number;
  montoPagado: number;
  montoTotal: number;
} {
  return {
    etapasCompletadas: etapas.filter((e) => e.estado === "completada").length,
    etapasTotal: etapas.length,
    montoPagado: etapas
      .filter((e) => e.pagoEstado === "pagado")
      .reduce((suma, e) => suma + (e.monto ?? 0), 0),
    montoTotal: etapas.reduce((suma, e) => suma + (e.monto ?? 0), 0),
  };
}

/** Etapa inicial sin costo: la fase de planeación y diseño siempre es gratis. */
export function etapaPlaneacion(): {
  nombre: string;
  descripcion: string;
  orden: number;
  monto: number;
  requierePago: boolean;
  pagoEstado: "no_requerido";
  estado: "en_curso";
} {
  return {
    nombre: "Planeación y diseño — Gratis",
    descripcion:
      "Fase gratis: chat, alcance, vistas y propuesta. Aquí definimos todo antes de pagar.",
    orden: 1,
    monto: 0,
    requierePago: false,
    pagoEstado: "no_requerido",
    estado: "en_curso",
  };
}
