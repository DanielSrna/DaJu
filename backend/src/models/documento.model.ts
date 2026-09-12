import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

/**
 * Manual o documento PDF del entorno (proyecto o espacio).
 * El admin lo sube con título y descripción; el cliente lo descarga.
 */
const documentoSchema = new Schema(
  {
    proyectoId: {
      type: Types.ObjectId,
      ref: "Proyecto",
      default: null,
      index: true,
    },
    espacioId: {
      type: Types.ObjectId,
      ref: "Espacio",
      default: null,
      index: true,
    },
    titulo: { type: String, required: true, trim: true, maxlength: 120 },
    descripcion: { type: String, default: "", trim: true, maxlength: 500 },
    archivo: {
      type: {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        nombre: { type: String, default: "" },
        tamañoBytes: { type: Number, default: 0 },
      },
      required: true,
    },
    subidoPor: { type: Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Documento = InferSchemaType<typeof documentoSchema>;
export type DocumentoDocument = HydratedDocument<Documento>;

export const DocumentoModel = model("Documento", documentoSchema);
