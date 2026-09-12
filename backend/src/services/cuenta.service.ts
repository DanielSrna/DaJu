import bcrypt from "bcryptjs";
import { UserModel } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";
import { authService } from "./auth.service";

/**
 * Cuenta del comprador antes de pagar.
 * Si el email no existe: crea la cuenta (rol cliente, sin verificar) y envía
 * el correo de confirmación. Si existe: valida la contraseña.
 * Las cuentas admin no pueden comprar.
 */
export class CuentaService {
  async resolverOCrearCliente(data: {
    email: string;
    nombre?: string;
    segundoNombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
    fechaNacimiento?: Date;
    aceptaCondiciones?: { version: string; fecha: Date };
    aceptaDatos?: { version: string; fecha: Date };
    password?: string;
  }): Promise<{ id: string; nuevo: boolean }> {
    logger.proceso("CuentaService.resolverOCrearCliente", {
      email: data.email,
    });
    const existente = await UserModel.findOne({ email: data.email }).select(
      "+passwordHash",
    );
    if (existente) {
      if (existente.rol !== "cliente") {
        throw ApiError.validation(
          "Las cuentas de administrador no pueden comprar",
        );
      }
      if (
        !data.password ||
        !bcrypt.compareSync(data.password, existente.passwordHash)
      ) {
        logger.fracaso(
          "CuentaService.resolverOCrearCliente: contraseña incorrecta",
          {
            email: data.email,
          },
        );
        throw ApiError.unauthorized(
          "Ya existe una cuenta con este email. Inicia sesión con tu contraseña.",
        );
      }
      return { id: String(existente._id), nuevo: false };
    }

    if (!data.nombre || !data.password) {
      throw ApiError.validation(
        "Nombre y contraseña son obligatorios para crear tu cuenta",
      );
    }
    const nombreCompleto = [
      data.nombre,
      data.segundoNombre,
      data.primerApellido,
      data.segundoApellido,
    ]
      .map((parte) => parte?.trim())
      .filter(Boolean)
      .join(" ");

    const doc = await UserModel.create({
      email: data.email,
      passwordHash: bcrypt.hashSync(data.password, 12),
      nombre: nombreCompleto,
      ...(data.segundoNombre !== undefined
        ? { segundoNombre: data.segundoNombre.trim() }
        : {}),
      ...(data.primerApellido !== undefined
        ? { primerApellido: data.primerApellido.trim() }
        : {}),
      ...(data.segundoApellido !== undefined
        ? { segundoApellido: data.segundoApellido.trim() }
        : {}),
      ...(data.fechaNacimiento
        ? { fechaNacimiento: data.fechaNacimiento }
        : {}),
      ...(data.aceptaCondiciones
        ? { aceptaCondiciones: data.aceptaCondiciones }
        : {}),
      ...(data.aceptaDatos ? { aceptaDatos: data.aceptaDatos } : {}),
      rol: "cliente",
      activo: true,
      emailVerificado: false,
    });
    await authService.enviarVerificacion(doc);
    logger.exito("CuentaService.resolverOCrearCliente: cuenta creada", {
      email: data.email,
      userId: String(doc._id),
    });
    return { id: String(doc._id), nuevo: true };
  }
}

export const cuentaService = new CuentaService();
