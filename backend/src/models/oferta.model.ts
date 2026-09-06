import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Oferta de la vitrina: plantilla (solución web lista para desplegar)
 * o consultoría (servicio por sesiones). Un solo modelo, campos por tipo.
 */
const ofertaSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: ["plantilla", "consultoria"],
      required: true,
      index: true,
    },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    // Plantillas:
    features: { type: [String], default: [] },
    desde: { type: Number, default: null, min: 0 },
    // Consultoría:
    para: { type: String, default: "", trim: true },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Oferta = InferSchemaType<typeof ofertaSchema>;
export const OfertaModel = model("Oferta", ofertaSchema);
