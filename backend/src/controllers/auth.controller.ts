import { NextFunction, Request, Response } from "express";
import { authService } from "../services/auth.service";
import { logger } from "../config/logger";
import {
  COOKIE_NAMES,
  cookieOptions,
  accessTokenMaxAgeMs,
  refreshTokenMaxAgeMs,
} from "../utils/jwt";

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(
    COOKIE_NAMES.access,
    tokens.accessToken,
    cookieOptions(accessTokenMaxAgeMs()),
  );
  res.cookie(
    COOKIE_NAMES.refresh,
    tokens.refreshToken,
    cookieOptions(refreshTokenMaxAgeMs()),
  );
}

export class AuthController {
  async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("AuthController.register");
    try {
      const { email, password, nombre } = req.body;
      const { user, tokens } = await authService.register({
        email,
        password,
        nombre,
      });
      setAuthCookies(res, tokens);
      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  }

  async solicitarRestablecimiento(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("AuthController.solicitarRestablecimiento");
    try {
      await authService.solicitarRestablecimiento(req.body.email);
      res.status(200).json({
        ok: true,
        mensaje: "Si el correo existe, recibirás un enlace en unos minutos.",
      });
    } catch (error) {
      next(error);
    }
  }

  async restablecerContrasena(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("AuthController.restablecerContrasena");
    try {
      await authService.restablecerContrasena(
        req.body.token,
        req.body.password,
      );
      res.status(200).json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  async verificarEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("AuthController.verificarEmail");
    try {
      const user = await authService.verificarEmail(req.body.token);
      res.status(200).json({ ok: true, user });
    } catch (error) {
      next(error);
    }
  }

  async reenviarVerificacion(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("AuthController.reenviarVerificacion");
    try {
      await authService.reenviarVerificacion(req.body.email);
      res.status(200).json({
        ok: true,
        mensaje:
          "Si la cuenta existe y no está verificada, recibirás el enlace.",
      });
    } catch (error) {
      next(error);
    }
  }

  async verificarManual(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("AuthController.verificarManual", {
      userId: req.params.id,
    });
    try {
      const user = await authService.verificarManual(req.params.id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("AuthController.login");
    try {
      const { email, password } = req.body;
      const { user, tokens } = await authService.login({ email, password });
      setAuthCookies(res, tokens);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  async refresh(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("AuthController.refresh");
    try {
      const refreshToken = req.cookies?.[COOKIE_NAMES.refresh];
      if (!refreshToken) {
        res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "No hay sesión activa" },
        });
        return;
      }
      const { user, tokens } = await authService.refresh(refreshToken);
      setAuthCookies(res, tokens);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  async logout(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("AuthController.logout");
    try {
      res.clearCookie(COOKIE_NAMES.access, cookieOptions(0));
      res.clearCookie(COOKIE_NAMES.refresh, cookieOptions(0));
      res.status(200).json({ message: "Sesión cerrada" });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("AuthController.me");
    try {
      if (!req.user) {
        res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "No autenticado" },
        });
        return;
      }
      const user = await authService.getMe(req.user.id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
