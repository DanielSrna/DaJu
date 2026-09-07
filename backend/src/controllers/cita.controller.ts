import { NextFunction, Request, Response } from "express";
import { citaService } from "../services/cita.service";
import { ApiError } from "../utils/ApiError";

export class CitaController {
  async confirmar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { franja, linkVideollamada } = req.body as {
        franja?: string;
        linkVideollamada?: string;
      };
      if (!franja)
        throw ApiError.validation("Debes elegir la franja a confirmar");
      const cita = await citaService.confirmar(
        req.params.id,
        req.user!.id,
        new Date(franja),
        linkVideollamada ?? "",
      );
      res.status(200).json({ cita });
    } catch (error) {
      next(error);
    }
  }

  async realizar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const cita = await citaService.realizar(req.params.id);
      res.status(200).json({ cita });
    } catch (error) {
      next(error);
    }
  }

  async cancelar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const cita = await citaService.cancelar(
        req.params.id,
        req.user!.rol === "cliente" ? req.user!.id : undefined,
      );
      res.status(200).json({ cita });
    } catch (error) {
      next(error);
    }
  }
}

export const citaController = new CitaController();
