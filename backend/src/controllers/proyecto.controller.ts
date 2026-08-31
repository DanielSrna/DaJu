import { NextFunction, Request, Response } from "express";
import { proyectoService } from "../services/proyecto.service";
import { capacidadService } from "../services/capacidad.service";
import { logger } from "../config/logger";

export class ProyectoController {
  async listarMios(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ProyectoController.listarMios");
    try {
      if (!req.user) {
        res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "No autenticado" },
        });
        return;
      }
      const proyectos = await proyectoService.listarMios(req.user.id);
      res.status(200).json({ proyectos });
    } catch (error) {
      next(error);
    }
  }

  async listarTodos(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ProyectoController.listarTodos");
    try {
      const filtros: {
        estado?: string;
        email?: string;
        pagoEstado?: string;
        pagina: number;
        limite: number;
      } = {
        pagina: Number(req.query.pagina ?? 1),
        limite: Number(req.query.limite ?? 20),
      };
      if (typeof req.query.estado === "string")
        filtros.estado = req.query.estado;
      if (typeof req.query.email === "string") filtros.email = req.query.email;
      if (typeof req.query.pagoEstado === "string")
        filtros.pagoEstado = req.query.pagoEstado;

      const resultado = await proyectoService.listarTodos(filtros);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obtener(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ProyectoController.obtener", { id: req.params.id });
    try {
      if (!req.user) {
        res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "No autenticado" },
        });
        return;
      }
      const proyecto = await proyectoService.obtener(
        req.params.id,
        req.user.rol,
        req.user.id,
      );
      res.status(200).json({ proyecto });
    } catch (error) {
      next(error);
    }
  }

  async cambiarEstado(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ProyectoController.cambiarEstado", { id: req.params.id });
    try {
      if (!req.user) {
        res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "No autenticado" },
        });
        return;
      }
      const proyecto = await proyectoService.cambiarEstado(
        req.params.id,
        req.body.estado,
        req.user.rol,
        req.user.id,
      );
      res.status(200).json({ proyecto });
    } catch (error) {
      next(error);
    }
  }

  async obtenerGarantia(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ProyectoController.obtenerGarantia", { id: req.params.id });
    try {
      if (!req.user) {
        res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "No autenticado" },
        });
        return;
      }
      const garantia = await proyectoService.obtenerGarantia(
        req.params.id,
        req.user.rol,
        req.user.id,
      );
      res.status(200).json({ garantia });
    } catch (error) {
      next(error);
    }
  }

  async obtenerCapacidad(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ProyectoController.obtenerCapacidad");
    try {
      const config = await capacidadService.obtenerConfig();
      res.status(200).json(config);
    } catch (error) {
      next(error);
    }
  }

  async actualizarCapacidad(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("ProyectoController.actualizarCapacidad");
    try {
      const resultado = await capacidadService.actualizarAjustes(req.body);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
}

export const proyectoController = new ProyectoController();
