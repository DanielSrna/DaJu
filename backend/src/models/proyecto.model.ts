import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";
import { etapaSchema } from "./etapa.schema";

const proyectoSchema = new Schema(
  {
    clienteId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pagoId: {
      type: Types.ObjectId,
      ref: "Pago",
      unique: true,
      sparse: true,
      comment: "Primer pago confirmado; nulo mientras está en planeación",
    },
    paquete: {
      slug: { type: String, required: true },
      nombre: { type: String, required: true },
      tipo: {
        type: String,
        enum: ["validor", "corporativo", "operativo"],
        required: true,
      },
      vistasIncluidas: { type: Number, required: true },
      soporteMeses: { type: Number, required: true },
      diasEntrega: { type: Number, required: true },
    },
    estado: {
      type: String,
      enum: [
        "planeacion",
        "recibido",
        "diseno",
        "desarrollo",
        "despliegue",
        "entregado",
        "pausado",
        "cancelado",
      ],
      default: "planeacion",
      index: true,
    },
    fechaCompra: {
      type: Date,
      default: null,
      comment: "Se congela al confirmar el primer pago",
    },
    fechaEntrega: {
      type: Date,
      default: null,
      comment: "Compra + días hábiles (congelada)",
    },
    fechaEntregado: {
      type: Date,
      default: null,
      comment: "Inicia la garantía (soporte)",
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
    funcionalidades: {
      type: [
        {
          id: { type: String },
          nombre: { type: String },
          complejidad: { type: String, enum: ["facil", "media", "dificil"] },
          precio: { type: Number },
        },
      ],
      default: [],
      comment: "Snapshot de funcionalidades adicionales compradas",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Proyecto = InferSchemaType<typeof proyectoSchema>;
export type ProyectoDocument = HydratedDocument<Proyecto>;

export const ProyectoModel = model("Proyecto", proyectoSchema);
