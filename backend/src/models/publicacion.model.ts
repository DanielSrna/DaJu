import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Publicaciones del Blog: conceptos y noticias de la agencia.
 * Sin autor público, sin fechas visibles, sin comentarios ni likes.
 * `secciones` asocia la publicación a páginas de la vitrina (FAQ, post-venta...)
 * para mostrar "relacionados" dentro de ellas.
 */
const publicacionSchema = new Schema(
  {
    titulo: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    tipo: {
      type: String,
      enum: ["concepto", "noticia"],
      required: true,
      index: true,
    },
    resumen: { type: String, required: true, trim: true },
    contenido: { type: String, required: true, trim: true },
    secciones: {
      type: [
        {
          type: String,
          enum: ["inicio", "productos", "faq", "postventa"],
        },
      ],
      default: [],
      index: true,
      comment: "Secciones de la vitrina donde se sugiere esta publicación",
    },
    publicado: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Publicacion = InferSchemaType<typeof publicacionSchema>;

export const PublicacionModel = model(
  "Publicacion",
  publicacionSchema,
  "publicaciones",
);
