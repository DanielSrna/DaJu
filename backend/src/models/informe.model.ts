import {
  Schema,
  model,
  InferSchemaType,
  HydratedDocument,
  Types,
} from "mongoose";

/**
 * Prueba del informe técnico de un proyecto/espacio.
 * - rendimiento / seguridad: llevan calificación 0..100.
 * - test: lleva `exitoso` (sí/no).
 */
const pruebaSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: ["rendimiento", "seguridad", "test"],
      required: true,
      index: true,
    },
    titulo: { type: String, required: true, trim: true, maxlength: 120 },
    descripcion: { type: String, default: "", trim: true, maxlength: 1000 },
    calificacion: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
      comment: "Puntaje 1..100 de pruebas de rendimiento o seguridad",
    },
    exitoso: {
      type: Boolean,
      default: null,
      comment: "Resultado de un test (sí/no)",
    },
    creadaPor: { type: Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

/**
 * Informe técnico (singleton por entorno): impacto, pruebas y tests que el
 * admin registra. El cliente ve el resumen y descarga el PDF con el detalle.
 */
const informeSchema = new Schema(
  {
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
    impacto: {
      porcentaje: { type: Number, default: null, min: 0, max: 100 },
      descripcion: { type: String, default: "", trim: true, maxlength: 500 },
    },
    pruebas: { type: [pruebaSchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type Informe = InferSchemaType<typeof informeSchema>;
export type InformeDocument = HydratedDocument<Informe>;

export const InformeModel = model("Informe", informeSchema);

/** Pruebas base que todo informe arranca a medir (editables por el admin). */
export function pruebasIniciales(): Array<{
  tipo: string;
  titulo: string;
  descripcion: string;
  calificacion: null;
  exitoso: null;
}> {
  return [
    {
      tipo: "rendimiento",
      titulo: "Prueba de carga (ISO/IEC 25010)",
      descripcion:
        "Mide tiempos de respuesta y estabilidad con usuarios concurrentes sobre el flujo principal.",
      calificacion: null,
      exitoso: null,
    },
    {
      tipo: "rendimiento",
      titulo: "Prueba de estrés",
      descripcion:
        "Lleva el sistema más allá de su capacidad esperada para verificar que se recupera sin perder datos.",
      calificacion: null,
      exitoso: null,
    },
    {
      tipo: "rendimiento",
      titulo: "Prueba de escalabilidad",
      descripcion:
        "Verifica que el sistema crece en usuarios y datos sin degradar el servicio.",
      calificacion: null,
      exitoso: null,
    },
    {
      tipo: "seguridad",
      titulo: "Análisis OWASP Top 10",
      descripcion:
        "Revisión de las diez vulnerabilidades más críticas en aplicaciones web.",
      calificacion: null,
      exitoso: null,
    },
    {
      tipo: "seguridad",
      titulo: "Prueba de penetración (pentest)",
      descripcion:
        "Simulación de ataques controlados para validar las defensas (alineado a ISO/IEC 27001).",
      calificacion: null,
      exitoso: null,
    },
  ];
}
