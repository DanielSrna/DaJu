import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  JwtPayload,
} from "../utils/jwt";
import { AuthUser } from "../types/express";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  nombre: string;
  rol: "admin" | "cliente";
  emailVerificado: boolean;
}

function toPublicUser(user: {
  _id: unknown;
  email: string;
  nombre: string;
  rol: "admin" | "cliente";
  emailVerificado?: boolean;
}): PublicUser {
  return {
    id: String(user._id),
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    emailVerificado: user.emailVerificado ?? true,
  };
}

function issueTokens(user: AuthUser): AuthTokens {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export class AuthService {
  async register(data: {
    email: string;
    password: string;
    nombre: string;
  }): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    logger.proceso("AuthService.register iniciando", { email: data.email });

    const email = data.email.trim().toLowerCase();
    const existing = await UserModel.exists({ email });
    if (existing) {
      logger.fracaso("AuthService.register: email ya registrado", { email });
      throw ApiError.conflict("El email ya está registrado");
    }

    const passwordHash = bcrypt.hashSync(data.password, 12);
    const doc = await UserModel.create({
      email,
      passwordHash,
      nombre: data.nombre.trim(),
      rol: "cliente",
      emailVerificado: false,
    });

    await this.enviarVerificacion(doc);

    const user = toPublicUser(doc);
    const tokens = issueTokens({ id: user.id, rol: user.rol });
    logger.exito("AuthService.register completado", { email, userId: user.id });
    return { user, tokens };
  }

  async login(data: {
    email: string;
    password: string;
  }): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    logger.proceso("AuthService.login iniciando", { email: data.email });

    const email = data.email.trim().toLowerCase();
    const doc = await UserModel.findOne({ email }).select("+passwordHash");
    if (!doc) {
      logger.fracaso("AuthService.login: credenciales inválidas", { email });
      throw ApiError.unauthorized("Credenciales inválidas");
    }

    const passwordOk = bcrypt.compareSync(data.password, doc.passwordHash);
    if (!passwordOk) {
      logger.fracaso("AuthService.login: contraseña incorrecta", { email });
      throw ApiError.unauthorized("Credenciales inválidas");
    }

    if (!doc.activo) {
      logger.fracaso("AuthService.login: usuario inactivo", { email });
      throw ApiError.forbidden("Cuenta desactivada");
    }

    const user = toPublicUser(doc);
    const tokens = issueTokens({ id: user.id, rol: user.rol });
    logger.exito("AuthService.login completado", { email, userId: user.id });
    return { user, tokens };
  }

  async refresh(refreshToken: string): Promise<{
    user: PublicUser;
    tokens: AuthTokens;
  }> {
    logger.proceso("AuthService.refresh iniciando");

    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      logger.fracaso("AuthService.refresh: refresh token inválido");
      throw ApiError.unauthorized("Sesión expirada, inicia sesión de nuevo");
    }

    const doc = await UserModel.findById(payload.id);
    if (!doc || !doc.activo) {
      logger.fracaso("AuthService.refresh: usuario no existe o inactivo", {
        userId: payload.id,
      });
      throw ApiError.unauthorized("Sesión expirada, inicia sesión de nuevo");
    }

    const user = toPublicUser(doc);
    const tokens = issueTokens({ id: user.id, rol: user.rol });
    logger.exito("AuthService.refresh completado", { userId: user.id });
    return { user, tokens };
  }

  async getMe(userId: string): Promise<PublicUser> {
    logger.proceso("AuthService.getMe iniciando", { userId });

    const doc = await UserModel.findById(userId);
    if (!doc) {
      logger.fracaso("AuthService.getMe: usuario no encontrado", { userId });
      throw ApiError.notFound("Usuario no encontrado");
    }

    const user = toPublicUser(doc);
    logger.exito("AuthService.getMe completado", { userId });
    return user;
  }

  /** Emite una sesión nueva para un usuario ya validado (cotización). */
  async emitirSesion(
    userId: string,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    logger.proceso("AuthService.emitirSesion", { userId });
    const doc = await UserModel.findById(userId);
    if (!doc || !doc.activo) {
      logger.fracaso("AuthService.emitirSesion: usuario no válido", { userId });
      throw ApiError.unauthorized("Cuenta no disponible");
    }
    const user = toPublicUser(doc);
    const tokens = issueTokens({ id: user.id, rol: user.rol });
    logger.exito("AuthService.emitirSesion completado", { userId });
    return { user, tokens };
  }

  /** Genera token de verificación (24 h) y envía el correo. */
  async enviarVerificacion(usuario: {
    _id: unknown;
    email: string;
    nombre: string;
    emailVerificacionToken?: string;
    emailVerificacionExpira?: Date | null;
    save(): Promise<unknown>;
  }): Promise<void> {
    logger.proceso("AuthService.enviarVerificacion", {
      userId: String(usuario._id),
    });
    const token = randomBytes(24).toString("base64url");
    usuario.emailVerificacionToken = token;
    usuario.emailVerificacionExpira = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );
    await usuario.save();

    try {
      const { notificacionesService } =
        await import("./notificaciones.service");
      await notificacionesService.enviarVerificacionEmail({
        email: usuario.email,
        nombre: usuario.nombre,
        token,
      });
    } catch (error) {
      logger.fracaso("AuthService.enviarVerificacion: falló el correo", {
        error: (error as Error).message,
      });
    }
    logger.exito("AuthService.enviarVerificacion completado", {
      userId: String(usuario._id),
    });
  }

  /** Confirma el email con el token del correo (válido por 24 h). */
  async verificarEmail(token: string): Promise<PublicUser> {
    logger.proceso("AuthService.verificarEmail");
    const usuario = await UserModel.findOne({
      emailVerificacionToken: token,
      emailVerificacionExpira: { $gt: new Date() },
    }).select("+emailVerificacionToken +emailVerificacionExpira");
    if (!usuario) {
      logger.fracaso("AuthService.verificarEmail: token inválido o expirado");
      throw ApiError.badRequest(
        "El enlace de verificación no es válido o ya expiró (24 horas)",
      );
    }
    usuario.emailVerificado = true;
    usuario.emailVerificacionToken = "";
    usuario.emailVerificacionExpira = null;
    await usuario.save();
    logger.exito("AuthService.verificarEmail completado", {
      userId: String(usuario._id),
    });
    return toPublicUser(usuario);
  }

  /** Reenvía el correo de verificación (silencioso si no existe o ya está verificado). */
  async reenviarVerificacion(email: string): Promise<void> {
    logger.proceso("AuthService.reenviarVerificacion", { email });
    const usuario = await UserModel.findOne({ email: email.toLowerCase() });
    if (!usuario || usuario.emailVerificado) {
      logger.exito(
        "AuthService.reenviarVerificacion: sin envío (inexistente o verificado)",
      );
      return;
    }
    await this.enviarVerificacion(usuario);
    logger.exito("AuthService.reenviarVerificacion completado", { email });
  }

  /** Admin: marca manualmente un correo como verificado. */
  async verificarManual(userId: string): Promise<PublicUser> {
    logger.proceso("AuthService.verificarManual", { userId });
    const usuario = await UserModel.findById(userId);
    if (!usuario) {
      logger.fracaso("AuthService.verificarManual: usuario no encontrado", {
        userId,
      });
      throw ApiError.notFound("Usuario no encontrado");
    }
    usuario.emailVerificado = true;
    usuario.emailVerificacionToken = "";
    usuario.emailVerificacionExpira = null;
    await usuario.save();
    logger.exito("AuthService.verificarManual completado", { userId });
    return toPublicUser(usuario);
  }

  /** Genera token de restablecimiento (30 min) y envía el correo. */
  async solicitarRestablecimiento(email: string): Promise<void> {
    logger.proceso("AuthService.solicitarRestablecimiento", { email });
    const usuario = await UserModel.findOne({ email: email.toLowerCase() });
    if (!usuario) {
      // No revelamos si la cuenta existe.
      logger.exito(
        "AuthService.solicitarRestablecimiento: sin cuenta (silencioso)",
      );
      return;
    }
    const token = randomBytes(24).toString("base64url");
    usuario.passwordResetToken = token;
    usuario.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await usuario.save();

    try {
      const { notificacionesService } =
        await import("./notificaciones.service");
      await notificacionesService.enviarRestablecer({
        email: usuario.email,
        token,
      });
    } catch (error) {
      logger.fracaso("AuthService.solicitarRestablecimiento: falló el correo", {
        error: (error as Error).message,
      });
    }
    logger.exito("AuthService.solicitarRestablecimiento completado");
  }

  /** Cambia la contraseña con el token (válido por 30 min). */
  async restablecerContrasena(
    token: string,
    nuevaContrasena: string,
  ): Promise<void> {
    logger.proceso("AuthService.restablecerContrasena");
    const usuario = await UserModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");
    if (!usuario) {
      throw ApiError.badRequest(
        "El enlace no es válido o ya expiró (30 minutos)",
      );
    }
    usuario.passwordHash = bcrypt.hashSync(nuevaContrasena, 12);
    usuario.passwordResetToken = "";
    usuario.passwordResetExpires = null;
    await usuario.save();
    logger.exito("AuthService.restablecerContrasena completado");
  }
}

export const authService = new AuthService();
