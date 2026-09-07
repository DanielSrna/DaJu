import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

/** Bitácora de actividad del proyecto (quién hizo qué y cuándo). */
const bitacoraSchema = new Schema(
  {
    proyectoId: {
      type: Types.ObjectId,
      ref: "Proyecto",
      required: true,
      index: true,
    },
    tipo: {
      type: String,
      enum: ["estado", "vista", "cotizacion", "funcion", "archivo", "nota"],
      required: true,
      index: true,
    },
    mensaje: { type: String, required: true, trim: true, maxlength: 300 },
    creadaPor: { type: Types.ObjectId, ref: "User", default: null },
    usuarioNombre: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Bitacora = InferSchemaType<typeof bitacoraSchema>;
export type BitacoraDocument = HydratedDocument<Bitacora>;

export const BitacoraModel = model("Bitacora", bitacoraSchema);
