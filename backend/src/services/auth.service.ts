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

interface PublicUser {
  id: string;
  email: string;
  nombre: string;
  rol: "admin" | "cliente";
}

function toPublicUser(user: {
  _id: unknown;
  email: string;
  nombre: string;
  rol: "admin" | "cliente";
}): PublicUser {
  return {
    id: String(user._id),
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
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
    });

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
}

export const authService = new AuthService();
