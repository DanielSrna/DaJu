import { Schema, model, InferSchemaType, HydratedDocument } from "mongoose";

const paqueteSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    tipo: {
      type: String,
      enum: ["validor", "corporativo", "operativo"],
      required: true,
      index: true,
    },
    descripcion: { type: String, required: true, trim: true },
    precio: { type: Number, required: true, min: 0 },
    moneda: { type: String, default: "USD", trim: true },
    vistasIncluidas: { type: Number, required: true, min: 1 },
    soporteMeses: { type: Number, required: true, min: 1 },
    diasEntrega: { type: Number, required: true, min: 1 },
    features: { type: [String], default: [] },
    imagen: {
      type: { url: String, publicId: String },
      default: null,
      comment: "Imagen de portada (catálogo)",
    },
    galeria: {
      type: [{ url: String, publicId: String }],
      default: [],
      comment: "Vistas del producto en el detalle",
    },
    detalles: {
      type: [{ titulo: String, texto: String }],
      default: [],
      comment: "Secciones descriptivas del detalle del producto",
    },
    activo: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Paquete = InferSchemaType<typeof paqueteSchema>;
export type PaqueteDocument = HydratedDocument<Paquete>;

export const PaqueteModel = model("Paquete", paqueteSchema);
