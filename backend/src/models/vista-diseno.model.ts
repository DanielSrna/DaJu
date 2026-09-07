import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

/**
 * Vista del entorno de PLANTILLA: hilo de negociación de cada pantalla,
 * con obra gris (wireframe) que puede subir el admin y mockups del cliente.
 */
const vistaDisenoSchema = new Schema(
  {
    espacioId: {
      type: Types.ObjectId,
      ref: "Espacio",
      required: true,
      index: true,
    },
    nombre: { type: String, required: true, trim: true, maxlength: 100 },
    orden: { type: Number, default: 0 },
    estado: {
      type: String,
      enum: ["pendiente", "negociacion", "cotizacion", "aprobada"],
      default: "cotizacion",
      index: true,
    },
    muestraCliente: {
      type: { url: String, publicId: String, nombre: String },
      default: null,
      comment: "Referencia/mockup subido por el cliente",
    },
    obraGris: {
      type: { url: String, publicId: String },
      default: null,
      comment: "Wireframe en gris subido por el admin",
    },
    archivos: {
      type: [
        {
          url: String,
          publicId: String,
          nombre: String,
          mimeType: String,
          tamañoBytes: Number,
        },
      ],
      default: [],
      comment: "Documentos de la vista (imágenes o PDF)",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type VistaDiseno = InferSchemaType<typeof vistaDisenoSchema>;
export type VistaDisenoDocument = HydratedDocument<VistaDiseno>;

export const VistaDisenoModel = model("VistaDiseno", vistaDisenoSchema);
