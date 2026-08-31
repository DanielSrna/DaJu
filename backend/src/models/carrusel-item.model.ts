import { Schema, model, InferSchemaType } from "mongoose";

const carruselItemSchema = new Schema(
  {
    imagen: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    link: { type: String, default: "", trim: true },
    titulo: { type: String, default: "", trim: true },
    activo: { type: Boolean, default: true, index: true },
    orden: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type CarruselItem = InferSchemaType<typeof carruselItemSchema>;

export const CarruselItemModel = model("CarruselItem", carruselItemSchema);
