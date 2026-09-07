import { NextFunction, Request, Response } from "express";
import { mensajeService, ContextoChat } from "../services/mensaje.service";
import { ApiError } from "../utils/ApiError";

function contextoDe(req: Request): {
  contexto: ContextoChat;
  contextoId: string;
} {
  const { contexto, contextoId } = req.query as Record<string, string>;
  if (!contexto || !contextoId) {
    throw ApiError.validation("contexto y contextoId son obligatorios");
  }
  if (!["proyecto", "espacio", "vista"].includes(contexto)) {
    throw ApiError.validation("contexto inválido");
  }
  return { contexto: contexto as ContextoChat, contextoId };
}

export class MensajeController {
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { contexto, contextoId } = contextoDe(req);
      const mensajes = await mensajeService.listar(
        contexto,
        contextoId,
        req.user!.rol,
        req.user!.id,
      );
      res.status(200).json({ mensajes });
    } catch (error) {
      next(error);
    }
  }

  async enviar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { contexto, contextoId } = contextoDeBody(req);
      const cuerpo = String(req.body.cuerpo ?? "")
        .trim()
        .slice(0, 4000);
      if (!cuerpo) {
        throw ApiError.validation("El mensaje no puede estar vacío");
      }
      const mensaje = await mensajeService.enviar(
        {
          contexto,
          contextoId,
          autorTipo: req.user!.rol,
          autorId: req.user!.id,
          cuerpo,
        },
        true,
      );
      res.status(201).json({ mensaje });
    } catch (error) {
      next(error);
    }
  }
}

function contextoDeBody(req: Request): {
  contexto: ContextoChat;
  contextoId: string;
} {
  const { contexto, contextoId } = req.body as Record<string, string>;
  if (!contexto || !contextoId) {
    throw ApiError.validation("contexto y contextoId son obligatorios");
  }
  if (!["proyecto", "espacio", "vista"].includes(contexto)) {
    throw ApiError.validation("contexto inválido");
  }
  return { contexto: contexto as ContextoChat, contextoId };
}

export const mensajeController = new MensajeController();
