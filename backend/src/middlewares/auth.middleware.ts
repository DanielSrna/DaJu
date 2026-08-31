import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";
import { AuthUser } from "../types/express";
import { COOKIE_NAMES, verifyAccessToken, JwtPayload } from "../utils/jwt";

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  logger.proceso("Verificando autenticación JWT", { requestId: req.requestId });

  const token = req.cookies?.[COOKIE_NAMES.access] ?? extractBearerToken(req);

  if (!token) {
    logger.fracaso("Autenticación rechazada: token ausente", {
      requestId: req.requestId,
    });
    next(ApiError.unauthorized("Token de acceso requerido"));
    return;
  }

  try {
    const payload = verifyAccessToken(token) as JwtPayload;
    const user: AuthUser = { id: payload.id, rol: payload.rol };
    req.user = user;
    logger.exito("Autenticación válida", {
      requestId: req.requestId,
      userId: user.id,
      rol: user.rol,
    });
    next();
  } catch (error) {
    logger.fracaso("Autenticación rechazada: token inválido o expirado", {
      requestId: req.requestId,
      error: (error as Error).message,
    });
    next(ApiError.unauthorized("Token inválido o expirado"));
  }
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice(7);
}

export function requireRol(...roles: Array<"admin" | "cliente">) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.rol)) {
      logger.fracaso("Acceso denegado por RBAC", {
        requestId: req.requestId,
        rol: req.user.rol,
        requerido: roles,
      });
      next(ApiError.forbidden());
      return;
    }
    next();
  };
}
