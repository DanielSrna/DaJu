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

/** Vista del briefing v2: una por cada vista/función comprada (semáforo). */
const vistaBriefingSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 100 },
    requisitos: { type: String, default: "", maxlength: 4000, trim: true },
    semaforo: {
      type: String,
      enum: ["pendiente", "negociacion", "cotizacion", "aprobada"],
      default: "cotizacion",
      index: true,
    },
    obraGris: {
      type: { url: String, publicId: String },
      default: null,
      comment: "Wireframe en gris subido por el admin",
    },
    archivos: {
      type: [
        {
          url: String,
          publicId: String,
          nombre: String,
          mimeType: String,
          tamañoBytes: Number,
        },
      ],
      default: [],
      comment: "Documentos de la vista (imágenes o PDF)",
    },
  },
  { _id: true },
);

/** Preferencia de identidad: lista definida, texto libre o en manos del dev. */
const preferenciaSchema = new Schema(
  {
    tipo: { type: String, enum: ["lista", "libre", "dev"], default: "lista" },
    valor: { type: String, default: "", maxlength: 800, trim: true },
    notas: { type: String, default: "", maxlength: 2000, trim: true },
  },
  { _id: false },
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
      // ---- V2: briefing guiado y reutilizable ----
      resumen: {
        nombreProyecto: { type: String, default: "", trim: true },
        descripcionNegocio: {
          type: String,
          default: "",
          maxlength: 4000,
          trim: true,
        },
        objetivos: { type: String, default: "", maxlength: 4000, trim: true },
        problemaActual: {
          type: String,
          default: "",
          maxlength: 4000,
          trim: true,
        },
        flujoPrincipal: {
          type: String,
          default: "",
          maxlength: 4000,
          trim: true,
        },
        ejemploFlujo: {
          type: String,
          default: "",
          maxlength: 4000,
          trim: true,
        },
        plazoDeseado: { type: String, default: "", maxlength: 200, trim: true },
        noIncluir: { type: String, default: "", maxlength: 2000, trim: true },
        referenciasLinks: {
          type: String,
          default: "",
          maxlength: 1000,
          trim: true,
        },
        identidadActual: {
          type: String,
          enum: ["", "tengo", "construyo"],
          default: "",
        },
        idioma: {
          type: String,
          default: "Español",
          maxlength: 100,
          trim: true,
        },
        usuarios: {
          cantidad: { type: Number, default: 0, min: 0 },
          tipos: { type: [String], default: [] },
          permisos: { type: [String], default: [] },
        },
      },
      vistas: {
        type: [vistaBriefingSchema],
        default: [],
        comment:
          "Una por vista/función comprada: requisitos + semáforo + chat (ctx vista)",
      },
      identidad: {
        fuentes: { type: preferenciaSchema, default: () => ({}) },
        colores: { type: preferenciaSchema, default: () => ({}) },
        vibra: { type: preferenciaSchema, default: () => ({}) },
      },
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
