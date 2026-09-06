import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Configuración CMS (singleton).
 * - logo: imagen del header
 * - colores: paleta de la web (primario/secundario/acento)
 * - marquesina: franja superior (texto + on/off)
 * - textos: contenido editable por claves (hero.titulo, productos.titulo...)
 * - descuento: descuento global anunciado en marquesina (20/40/70%)
 * - diasExtra: días hábiles adicionales a todos los productos (solo compras nuevas)
 * - editor: BORRADOR — los cambios del admin viven aquí hasta "Publicar"
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
    textos: {
      type: Schema.Types.Mixed,
      default: {},
    },
    descuento: {
      activo: { type: Boolean, default: false },
      porcentaje: { type: Number, default: 20, enum: [20, 40, 70] },
      mensaje: { type: String, default: "", trim: true },
      hasta: { type: String, default: null, trim: true },
    },
    diasExtra: { type: Number, default: 0 },
    editor: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type CmsConfig = InferSchemaType<typeof cmsConfigSchema>;

export const CmsConfigModel = model("CmsConfig", cmsConfigSchema);
