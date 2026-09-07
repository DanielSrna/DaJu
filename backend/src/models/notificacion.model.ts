import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

/**
 * Notificaciones internas de dos niveles:
 * - "plataforma": hitos del negocio (compra confirmada, pago de función…)
 *   → siempre para los ADMINS.
 * - "proyecto": novedades de un entorno/proyecto (mensaje del cliente, cita
 *   propuesta, solicitud, vista nueva…) → administradores o el cliente dueño.
 */
const notificacionSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: ["plataforma", "proyecto"],
      required: true,
      index: true,
    },
    paraAdmin: { type: Boolean, default: false, index: true },
    destinatario: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
      comment: "Cliente destinatario (si no es para admin)",
    },
    titulo: { type: String, required: true, trim: true, maxlength: 120 },
    cuerpo: { type: String, default: "", maxlength: 500, trim: true },
    contexto: {
      type: String,
      enum: ["compra", "proyecto", "espacio", "vista", "cita", "solicitud"],
      default: "proyecto",
    },
    contextoId: { type: Types.ObjectId, default: null },
    creadaPor: { type: Types.ObjectId, ref: "User", default: null },
    leidaPor: { type: [Types.ObjectId], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "notificaciones",
  },
);

export type Notificacion = InferSchemaType<typeof notificacionSchema>;
export type NotificacionDocument = HydratedDocument<Notificacion>;

export const NotificacionModel = model("Notificacion", notificacionSchema);
