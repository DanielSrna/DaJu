import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

const pagoSchema = new Schema(
  {
    tipoProducto: {
      type: String,
      enum: ["paquete", "plantilla", "servicio", "funcionalidad"],
      default: "paquete",
      index: true,
      comment: "Familia comprada; define el entorno de acceso",
    },
    paqueteId: { type: Types.ObjectId, ref: "Paquete", default: null },
    productoId: {
      type: Types.ObjectId,
      default: null,
      comment: "Id del ítem comprado (plantilla o servicio)",
    },
    paqueteSlug: { type: String, default: "", index: true },
    productoSlug: {
      type: String,
      default: "",
      index: true,
      comment: "Slug del ítem comprado (plantilla o servicio)",
    },
    cantidad: {
      type: Number,
      default: 1,
      min: 1,
      comment: "Sesiones compradas (solo servicios)",
    },
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
