import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

const archivoBriefingSchema = new Schema(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    nombre: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    tamañoBytes: { type: Number, required: true },
    tipo: {
      type: String,
      enum: ["logo", "imagen", "pdf", "otro"],
      required: true,
    },
  },
  { _id: true },
);

const briefSchema = new Schema(
  {
    proyectoId: {
      type: Types.ObjectId,
      ref: "Proyecto",
      required: true,
      unique: true,
    },
    clienteId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contenido: {
      empresa: { type: String, default: "", trim: true },
      descripcionNegocio: { type: String, default: "", trim: true },
      objetivos: { type: String, default: "", trim: true },
      textos: { type: Schema.Types.Mixed, default: {} },
      requerimientos: { type: String, default: "", trim: true },
      extras: { type: Schema.Types.Mixed, default: {} },
    },
    archivos: { type: [archivoBriefingSchema], default: [] },
    completado: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Briefing = InferSchemaType<typeof briefSchema>;
export type BriefingDocument = HydratedDocument<Briefing>;

export const BriefingModel = model("Briefing", briefSchema);
