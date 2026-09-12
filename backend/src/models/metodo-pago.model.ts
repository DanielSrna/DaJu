import { Schema, model, InferSchemaType, HydratedDocument } from "mongoose";

/**
 * Método de pago configurable desde el panel admin.
 * - manual: transferencias (Bre-B, Nequi, DaviPlata, Nu, banco, USDT…):
 *   el cliente paga y sube el comprobante; el admin confirma.
 * - paypal: integración automática (Orders API + webhook).
 */
const metodoPagoSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    clave: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      comment: "Identificador estable (slug del nombre)",
    },
    tipo: {
      type: String,
      enum: ["manual", "paypal"],
      default: "manual",
      index: true,
    },
    moneda: {
      type: String,
      enum: ["COP", "USD"],
      default: "COP",
      comment: "COP usa la tasa configurada en el CMS; USD cobra en dólares",
    },
    titular: { type: String, default: "", trim: true },
    datos: {
      type: String,
      default: "",
      trim: true,
      comment: "Llave Bre-B, número Nequi/DaviPlata, cuenta o wallet",
    },
    instrucciones: { type: String, default: "", trim: true },
    qrUrl: {
      type: String,
      default: "",
      trim: true,
      comment: "Imagen de QR (opcional, subida por el admin)",
    },
    activo: { type: Boolean, default: true, index: true },
    orden: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type MetodoPago = InferSchemaType<typeof metodoPagoSchema>;
export type MetodoPagoDocument = HydratedDocument<MetodoPago>;

export const MetodoPagoModel = model("MetodoPago", metodoPagoSchema);
