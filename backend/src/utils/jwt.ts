import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { parseDurationToSeconds } from "./duration";
import { AuthUser } from "../types/express";

export interface JwtPayload extends jwt.JwtPayload {
  id: string;
  rol: "admin" | "cliente";
}

const COOKIE_PREFIX = "MainPlataform";

type ExpiresIn = NonNullable<jwt.SignOptions["expiresIn"]>;

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, rol: user.rol }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRATION as ExpiresIn,
  });
}

export function signRefreshToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, rol: user.rol }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRATION as ExpiresIn,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}

export function accessTokenMaxAgeMs(): number {
  return parseDurationToSeconds(env.JWT_ACCESS_EXPIRATION) * 1000;
}

export function refreshTokenMaxAgeMs(): number {
  return parseDurationToSeconds(env.JWT_REFRESH_EXPIRATION) * 1000;
}

export const COOKIE_NAMES = {
  access: `${COOKIE_PREFIX}_accessToken`,
  refresh: `${COOKIE_PREFIX}_refreshToken`,
} as const;

export function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeMs,
  };
}
