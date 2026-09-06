import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Catálogo de funcionalidades adicionales que el cliente puede sumar a un
 * paquete antes de pagar. Cada funcionalidad incluye su propia vista.
 * Precio estándar por complejidad (editable por el admin por funcionalidad).
 */
const funcionalidadExtraSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    clave: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      comment: "Identificador estable para el seed (slug del nombre)",
    },
    descripcion: { type: String, default: "", trim: true },
    categoria: {
      type: String,
      enum: ["integraciones", "pagina", "usuarios", "datos"],
      required: true,
      index: true,
    },
    complejidad: {
      type: String,
      enum: ["facil", "media", "dificil"],
      required: true,
    },
    precio: { type: Number, required: true, min: 0 },
    activo: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type FuncionalidadExtra = InferSchemaType<
  typeof funcionalidadExtraSchema
>;

export const FuncionalidadExtraModel = model(
  "FuncionalidadExtra",
  funcionalidadExtraSchema,
);
