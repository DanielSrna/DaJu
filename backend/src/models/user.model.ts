import { Schema, model, InferSchemaType, HydratedDocument } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordResetToken: { type: String, default: "", select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
      comment: "Nombre completo para mostrar (se arma con las partes)",
    },
    segundoNombre: { type: String, default: "", trim: true },
    primerApellido: { type: String, default: "", trim: true },
    segundoApellido: { type: String, default: "", trim: true },
    fechaNacimiento: {
      type: Date,
      default: null,
      comment: "Se exige mayoría de edad al registrarse",
    },
    aceptaCondiciones: {
      type: { version: String, fecha: Date },
      default: null,
      comment: "Aceptación del contrato de condiciones del servicio",
    },
    aceptaDatos: {
      type: { version: String, fecha: Date },
      default: null,
      comment: "Aceptación del contrato de manejo de datos personales",
    },
    rol: {
      type: String,
      enum: ["admin", "cliente"],
      default: "cliente",
    },
    activo: {
      type: Boolean,
      default: true,
    },
    emailVerificado: {
      type: Boolean,
      default: true,
      index: true,
      comment:
        "Los registros nuevos nacen en false; las cuentas históricas quedan verificadas",
    },
    emailVerificacionToken: { type: String, default: "", select: false },
    emailVerificacionExpira: { type: Date, default: null, select: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

userSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    return ret;
  },
});

export const UserModel = model("User", userSchema);
