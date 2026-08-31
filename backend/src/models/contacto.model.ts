import { Schema, model, InferSchemaType } from "mongoose";

const contactoSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    asunto: { type: String, default: "", trim: true },
    mensaje: { type: String, required: true, trim: true },
    estado: {
      type: String,
      enum: ["recibido", "respondido", "archivado"],
      default: "recibido",
      index: true,
    },
    enviadoAdmin: { type: Boolean, default: false },
    acuseEnviado: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Contacto = InferSchemaType<typeof contactoSchema>;

export const ContactoModel = model("Contacto", contactoSchema);
