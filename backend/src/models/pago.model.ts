import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

const pagoSchema = new Schema(
  {
    paqueteId: { type: Types.ObjectId, ref: "Paquete", required: true },
    paqueteSlug: { type: String, required: true, index: true },
    descripcion: { type: String, required: true, trim: true },
    monto: { type: Number, required: true, min: 0 },
    moneda: { type: String, default: "USD", trim: true },
    emailCliente: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    clienteId: { type: Types.ObjectId, ref: "User", default: null },
    estado: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    referencia: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      comment: "Identificador de la transacción en ePayco (x_ref_payco)",
    },
    metodoPago: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Pago = InferSchemaType<typeof pagoSchema>;
export type PagoDocument = HydratedDocument<Pago>;

export const PagoModel = model("Pago", pagoSchema);
