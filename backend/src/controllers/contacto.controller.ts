import { NextFunction, Request, Response } from "express";
import { contactoService } from "../services/contacto.service";
import { logger } from "../config/logger";

export class ContactoController {
  async enviar(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("ContactoController.enviar");
    try {
      const mensaje = await contactoService.enviar({
        nombre: req.body.nombre,
        email: req.body.email,
        asunto: req.body.asunto,
        mensaje: req.body.mensaje,
      });
      res.status(201).json({ mensaje });
    } catch (error) {
      next(error);
    }
  }

  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("ContactoController.listar");
    try {
      const resultado = await contactoService.listar(
        Number(req.query.pagina ?? 1),
        Number(req.query.limite ?? 20),
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
}

export const contactoController = new ContactoController();
