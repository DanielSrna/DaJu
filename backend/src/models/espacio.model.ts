import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

/** Espacio de trabajo comprado: nace del pago confirmado (plantilla o servicio). */
const espacioSchema = new Schema(
  {
    clienteId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tipoProducto: {
      type: String,
      enum: ["plantilla", "servicio"],
      required: true,
      index: true,
    },
    productoId: { type: Types.ObjectId, required: true, index: true },
    productoSlug: { type: String, default: "", index: true },
    pagoId: { type: Types.ObjectId, ref: "Pago", required: true, unique: true },
    estado: {
      type: String,
      enum: ["activo", "completado"],
      default: "activo",
      index: true,
    },
    sesiones: {
      total: { type: Number, default: 1, min: 0 },
      usadas: { type: Number, default: 0, min: 0 },
    },
    aux: {
      type: Boolean,
      default: undefined,
      select: false,
      comment:
        "Contador de sesiones: servicios (1 cita realizada consume 1 sesión)",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Espacio = InferSchemaType<typeof espacioSchema>;
export type EspacioDocument = HydratedDocument<Espacio>;

export const EspacioModel = model("Espacio", espacioSchema);
