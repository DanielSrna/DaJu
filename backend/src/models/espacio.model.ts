import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";
import { etapaSchema } from "./etapa.schema";

/**
 * Espacio de trabajo de plantilla o servicio.
 * Nace en "planeacion" al registrarse (fase gratis) y pasa a "activo"
 * cuando se confirma el primer pago.
 */
const espacioSchema = new Schema(
  {
    clienteId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tipoProducto: {
      type: String,
      enum: ["plantilla", "servicio"],
      required: true,
      index: true,
    },
    productoId: { type: Types.ObjectId, required: true, index: true },
    productoSlug: { type: String, default: "", index: true },
    pagoId: {
      type: Types.ObjectId,
      ref: "Pago",
      unique: true,
      sparse: true,
      comment: "Primer pago confirmado; nulo mientras está en planeación",
    },
    estado: {
      type: String,
      enum: ["planeacion", "activo", "completado"],
      default: "planeacion",
      index: true,
    },
    precioBase: {
      type: Number,
      default: 0,
      min: 0,
      comment: "Precio de catálogo al registrar (referencia de la propuesta)",
    },
    moneda: { type: String, default: "USD", trim: true },
    etapas: {
      type: [etapaSchema],
      default: [],
      comment: "Plan de trabajo libre definido por el admin",
    },
    sesiones: {
      total: { type: Number, default: 1, min: 0 },
      usadas: { type: Number, default: 0, min: 0 },
    },
    aux: {
      type: Boolean,
      default: undefined,
      select: false,
      comment:
        "Contador de sesiones: servicios (1 cita realizada consume 1 sesión)",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Espacio = InferSchemaType<typeof espacioSchema>;
export type EspacioDocument = HydratedDocument<Espacio>;

export const EspacioModel = model("Espacio", espacioSchema);
