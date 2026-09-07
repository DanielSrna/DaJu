import { Schema, model, InferSchemaType, HydratedDocument } from "mongoose";

/** Plantilla: solución web lista para desplegar (ej. Reservas, Inventario). */
const plantillaSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    plataforma: {
      type: String,
      required: true,
      trim: true,
      comment: "Solución que resuelve: ej. 'Reservas', 'Inventario'",
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
      comment: "Captura principal de la plantilla",
    },
    galeria: {
      type: [{ url: String, publicId: String }],
      default: [],
      comment: "Vistas de las pantallas en el detalle",
    },
    detalles: {
      type: [{ titulo: String, texto: String }],
      default: [],
      comment: "Secciones descriptivas del detalle",
    },
    activo: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Plantilla = InferSchemaType<typeof plantillaSchema>;
export type PlantillaDocument = HydratedDocument<Plantilla>;

export const PlantillaModel = model("Plantilla", plantillaSchema);
