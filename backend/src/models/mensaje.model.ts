import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

/**
 * Mensaje de chat del portal. Contexto:
 * - "proyecto": chat del entorno del paquete (contextoId = proyectoId)
 * - "espacio": chat del entorno de plantilla/servicio (contextoId = espacioId)
 * - "vista": hilo de una vista (contextoId = vistaId; proyecto del briefing o
 *   vista de plantilla)
 */
const mensajeSchema = new Schema(
  {
    contexto: {
      type: String,
      enum: ["proyecto", "espacio", "vista"],
      required: true,
      index: true,
    },
    contextoId: { type: Types.ObjectId, required: true, index: true },
    autorTipo: { type: String, enum: ["admin", "cliente"], required: true },
    autorId: { type: Types.ObjectId, ref: "User", required: true },
    cuerpo: { type: String, required: true, trim: true, maxlength: 4000 },
    archivos: {
      type: [
        {
          url: String,
          publicId: String,
          nombre: String,
          mime: String,
        },
      ],
      default: [],
      comment: "Adjuntos (imaganes/PDF) — misma política que briefing",
    },
    leidoPor: { type: [Types.ObjectId], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Mensaje = InferSchemaType<typeof mensajeSchema>;
export type MensajeDocument = HydratedDocument<Mensaje>;

export const MensajeModel = model("Mensaje", mensajeSchema);
