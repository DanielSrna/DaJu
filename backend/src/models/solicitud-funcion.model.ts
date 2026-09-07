import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

/**
 * Solicitud de funcionalidad adicional desde el entorno de plantilla/servicio.
 * El admin responde con costo; el pago se resuelve en la iteración 2b.
 */
const solicitudSchema = new Schema(
  {
    espacioId: {
      type: Types.ObjectId,
      ref: "Espacio",
      default: null,
      index: true,
    },
    proyectoId: {
      type: Types.ObjectId,
      ref: "Proyecto",
      default: null,
      index: true,
      comment: "Solicitud de vista/función de un proyecto (paquete)",
    },
    titulo: { type: String, required: true, trim: true, maxlength: 100 },
    descripcion: { type: String, required: true, trim: true, maxlength: 4000 },
    estado: {
      type: String,
      enum: ["abierta", "respondida", "aceptada", "pagada"],
      default: "abierta",
      index: true,
    },
    costo: {
      type: Number,
      default: 0,
      min: 0,
      comment: "Costo propuesto a aceptar",
    },
    respuestaAdmin: { type: String, default: "", maxlength: 4000, trim: true },
    respondidaPor: { type: Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type SolicitudFuncion = InferSchemaType<typeof solicitudSchema>;
export type SolicitudFuncionDocument = HydratedDocument<SolicitudFuncion>;

export const SolicitudFuncionModel = model("SolicitudFuncion", solicitudSchema);
