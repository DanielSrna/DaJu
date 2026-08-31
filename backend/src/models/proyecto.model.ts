import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

const proyectoSchema = new Schema(
  {
    clienteId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pagoId: { type: Types.ObjectId, ref: "Pago", required: true, unique: true },
    paquete: {
      slug: { type: String, required: true },
      nombre: { type: String, required: true },
      tipo: {
        type: String,
        enum: ["validor", "corporativo", "operativo"],
        required: true,
      },
      vistasIncluidas: { type: Number, required: true },
      soporteMeses: { type: Number, required: true },
      diasEntrega: { type: Number, required: true },
    },
    estado: {
      type: String,
      enum: ["recibido", "diseno", "desarrollo", "entregado"],
      default: "recibido",
      index: true,
    },
    fechaCompra: { type: Date, required: true },
    fechaEntrega: {
      type: Date,
      required: true,
      comment: "Compra + días hábiles (congelada)",
    },
    fechaEntregado: {
      type: Date,
      default: null,
      comment: "Inicia la garantía (soporte)",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Proyecto = InferSchemaType<typeof proyectoSchema>;
export type ProyectoDocument = HydratedDocument<Proyecto>;

export const ProyectoModel = model("Proyecto", proyectoSchema);
