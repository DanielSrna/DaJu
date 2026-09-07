import { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export function buildLimiter(opts: {
  windowMs: number;
  limit: number;
  message: { error: { code: string; message: string } };
}) {
  // Rate-limit DESACTIVADO por defecto (bloqueaba logins en desarrollo/producción).
  // Para reactivarlo en un entorno concreto: RATE_LIMIT_ENABLED=true en el .env.
  if (process.env.RATE_LIMIT_ENABLED !== "true") {
    return (_req: Request, _res: Response, next: NextFunction): void => next();
  }
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: opts.message,
  });
}

export const generalRateLimiter = buildLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Demasiadas peticiones, inténtalo más tarde",
    },
  },
});

export const authRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Demasiados intentos de autenticación",
    },
  },
});
