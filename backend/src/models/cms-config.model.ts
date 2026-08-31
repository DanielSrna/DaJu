import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Identidad visual + marquesina de la vitrina (configuración singleton).
 * - logo: imagen del header
 * - colores: paleta de la web
 * - marquesina: franja superior estilo MercadoLibre (texto + on/off)
 */
const cmsConfigSchema = new Schema(
  {
    logo: {
      type: { url: String, publicId: String },
      default: null,
    },
    colores: {
      primario: { type: String, default: "#000000", trim: true },
      secundario: { type: String, default: "#ffffff", trim: true },
      acento: { type: String, default: "#ffcc00", trim: true },
    },
    marquesina: {
      texto: { type: String, default: "", trim: true },
      activo: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type CmsConfig = InferSchemaType<typeof cmsConfigSchema>;

export const CmsConfigModel = model("CmsConfig", cmsConfigSchema);
