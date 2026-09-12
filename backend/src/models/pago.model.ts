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
    tipoPago: {
      type: String,
      enum: ["total", "etapa", "sesiones", "funcionalidad"],
      default: "total",
      index: true,
      comment:
        "total = compra completa; etapa = hito del plan; sesiones = consultoría",
    },
    paqueteId: { type: Types.ObjectId, ref: "Paquete", default: null },
    productoId: {
      type: Types.ObjectId,
      default: null,
      comment: "Id del ítem comprado (plantilla, servicio o solicitud)",
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
    montoCop: {
      type: Number,
      default: null,
      min: 0,
      comment: "Monto en pesos congelado con la tasa del CMS (métodos locales)",
    },
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
      enum: [
        "pending",
        "en_revision",
        "paid",
        "failed",
        "rechazado",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
    referencia: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      comment: "Identificador de la transacción en la pasarela (PayPal, etc.)",
    },
    metodoPago: {
      type: String,
      default: "",
      index: true,
      comment: "Clave del método elegido (nequi, bre-b, paypal…)",
    },
    codigo: {
      type: String,
      default: undefined,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
      comment:
        "Código corto que el cliente escribe en el mensaje de la transacción",
    },
    comprobante: {
      type: {
        url: String,
        publicId: String,
        nombre: String,
        subidoEn: Date,
      },
      default: null,
    },
    referenciaCliente: {
      type: String,
      default: "",
      trim: true,
      comment: "Número de transacción o nota que reporta el cliente",
    },
    proyectoId: {
      type: Types.ObjectId,
      ref: "Proyecto",
      default: null,
      index: true,
    },
    espacioId: {
      type: Types.ObjectId,
      ref: "Espacio",
      default: null,
      index: true,
    },
    etapaId: {
      type: String,
      default: "",
      comment: "Id de la etapa del plan a la que aplica este pago",
    },
    solicitadoPor: { type: Types.ObjectId, ref: "User", default: null },
    confirmadoPor: { type: Types.ObjectId, ref: "User", default: null },
    motivoRechazo: { type: String, default: "", trim: true },
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
