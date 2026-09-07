import { Schema, model, InferSchemaType, HydratedDocument } from "mongoose";

/** Servicio (consultoría): conocimiento por sesiones (auditorías, asesorías). */
const servicioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    categoria: {
      type: String,
      enum: ["auditoria", "asesoria", "aceleracion"],
      required: true,
      index: true,
    },
    descripcion: { type: String, required: true, trim: true },
    precio: {
      type: Number,
      required: true,
      min: 0,
      comment: "Precio por sesión (60 min)",
    },
    moneda: { type: String, default: "USD", trim: true },
    duracionMin: { type: Number, default: 60, min: 30 },
    canal: {
      type: String,
      enum: ["Meet", "Zoom"],
      default: "Meet",
      comment: "Plataforma de videollamada de la sesión",
    },
    incluye: {
      type: [String],
      default: [],
      comment: "Qué se trabaja en la sesión",
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

export type Servicio = InferSchemaType<typeof servicioSchema>;
export type ServicioDocument = HydratedDocument<Servicio>;

export const ServicioModel = model("Servicio", servicioSchema);
