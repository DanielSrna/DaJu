import { Schema, model, InferSchemaType, HydratedDocument } from "mongoose";

/**
 * Válvula de capacidad: suma/resta días hábiles a los paquetes públicos
 * (por tipo). Un solo documento de configuración (patrón singleton).
 */
const capacidadConfigSchema = new Schema(
  {
    ajustes: {
      validor: { type: Number, required: true, default: 0 },
      corporativo: { type: Number, required: true, default: 0 },
      operativo: { type: Number, required: true, default: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type TipoPaquete = "validor" | "corporativo" | "operativo";

export type CapacidadConfig = InferSchemaType<typeof capacidadConfigSchema>;
export type CapacidadConfigDocument = HydratedDocument<CapacidadConfig>;

export const CapacidadConfigModel = model(
  "CapacidadConfig",
  capacidadConfigSchema,
);
