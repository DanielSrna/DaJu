import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

/** Cita de consultoría: el cliente propone franjas y el admin confirma. */
const citaSchema = new Schema(
  {
    espacioId: {
      type: Types.ObjectId,
      ref: "Espacio",
      required: true,
      index: true,
    },
    sesion: {
      type: Number,
      required: true,
      min: 1,
      comment: "N.º de sesión consumida",
    },
    propuestas: {
      type: [Date],
      validate: {
        validator: (v: Date[]) => v.length >= 1 && v.length <= 2,
        message: "El cliente propone entre 1 y 2 franjas",
      },
      required: true,
      comment: "Franjas que propone el cliente (hasta 2)",
    },
    confirmada: {
      type: Date,
      default: null,
      comment: "Franja confirmada por el admin",
    },
    duracionMin: { type: Number, default: 60, min: 30 },
    canal: { type: String, enum: ["Meet", "Zoom"], default: "Meet" },
    estado: {
      type: String,
      enum: ["propuesta", "confirmada", "realizada", "cancelada"],
      default: "propuesta",
      index: true,
    },
    linkVideollamada: { type: String, default: "", trim: true },
    notas: { type: String, default: "", maxlength: 2000, trim: true },
    confirmadaPor: { type: Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Cita = InferSchemaType<typeof citaSchema>;
export type CitaDocument = HydratedDocument<Cita>;

export const CitaModel = model("Cita", citaSchema);
