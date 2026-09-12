import { NextFunction, Request, Response } from "express";
import { briefingService } from "../services/briefing.service";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export class BriefingController {
  async obtener(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("BriefingController.obtener", {
      proyectoId: req.params.proyectoId,
    });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const briefing = await briefingService.obtener(
        req.params.proyectoId,
        req.user.rol,
        req.user.id,
      );
      res.status(200).json({ briefing });
    } catch (error) {
      next(error);
    }
  }

  async guardarContenido(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("BriefingController.guardarContenido", {
      proyectoId: req.params.proyectoId,
    });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const contenido = req.body.contenido ?? {};
      const briefing = await briefingService.guardarContenido(
        req.params.proyectoId,
        req.user.rol,
        req.user.id,
        contenido,
        typeof req.body.completado === "boolean"
          ? req.body.completado
          : undefined,
      );
      res.status(200).json({ briefing });
    } catch (error) {
      next(error);
    }
  }

  async agregarVista(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const nombre = String(req.body.nombre ?? "").trim();
      if (nombre.length < 2)
        throw ApiError.validation("El nombre es obligatorio");
      const briefing = await briefingService.agregarVista(
        req.params.proyectoId,
        req.user.rol,
        req.user.id,
        nombre.slice(0, 100),
        typeof req.body.costoSugerido === "number"
          ? req.body.costoSugerido
          : undefined,
        typeof req.body.requisitos === "string"
          ? req.body.requisitos.slice(0, 500)
          : undefined,
      );
      res.status(201).json({ briefing });
    } catch (error) {
      next(error);
    }
  }

  async subirObraGrisVista(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ninguna imagen (campo 'imagen')",
        );
      }
      const briefing = await briefingService.subirObraGrisVista(
        req.params.proyectoId,
        req.params.vistaId,
        req.user.rol,
        req.user.id,
        {
          buffer: req.file.buffer,
          nombre: req.file.originalname,
          tamañoBytes: req.file.size,
          tipo: "imagen",
        },
      );
      res.status(200).json({ briefing });
    } catch (error) {
      next(error);
    }
  }

  async agregarArchivoVista(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ningún archivo (campo 'archivo')",
        );
      }
      const briefing = await briefingService.agregarArchivoVista(
        req.params.proyectoId,
        req.params.vistaId,
        req.user.rol,
        req.user.id,
        {
          buffer: req.file.buffer,
          nombre: req.file.originalname,
          tamañoBytes: req.file.size,
          tipo: "imagen",
        },
      );
      res.status(201).json({ briefing });
    } catch (error) {
      next(error);
    }
  }

  async eliminarArchivoVista(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const briefing = await briefingService.eliminarArchivoVista(
        req.params.proyectoId,
        req.params.vistaId,
        req.params.archivoId,
        req.user.rol,
        req.user.id,
      );
      res.status(200).json({ briefing });
    } catch (error) {
      next(error);
    }
  }

  async exportar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const texto = await briefingService.exportarTexto(
        req.params.proyectoId,
        req.user.rol,
        req.user.id,
      );
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="briefing-${req.params.proyectoId}.txt"`,
      );
      res.send(texto);
    } catch (error) {
      next(error);
    }
  }

  async actualizarVista(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("BriefingController.actualizarVista", {
      proyectoId: req.params.proyectoId,
      vistaId: req.params.vistaId,
    });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const datos =
        (req.body as {
          requisitos?: string;
          semaforo?: "pendiente" | "negociacion" | "aprobada";
          nombre?: string;
        }) ?? {};
      const briefing = await briefingService.actualizarVista(
        req.params.proyectoId,
        req.params.vistaId,
        datos,
        req.user.rol,
        req.user.id,
      );
      res.status(200).json({ briefing });
    } catch (error) {
      next(error);
    }
  }

  async subirArchivo(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("BriefingController.subirArchivo", {
      proyectoId: req.params.proyectoId,
    });
    try {
      if (!req.user) throw ApiError.unauthorized();
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ningún archivo (campo 'archivo')",
        );
      }

      const briefing = await briefingService.agregarArchivo(
        req.params.proyectoId,
        req.user.rol,
        req.user.id,
        {
          buffer: req.file.buffer,
          nombre: req.file.originalname,
          tamañoBytes: req.file.size,
          tipo: req.body.tipo ?? "otro",
        },
      );
      res.status(201).json({ briefing });
    } catch (error) {
      next(error);
    }
  }

  async eliminarArchivo(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("BriefingController.eliminarArchivo", {
      proyectoId: req.params.proyectoId,
    });
    try {
      if (!req.user) throw ApiError.unauthorized();
      const briefing = await briefingService.eliminarArchivo(
        req.params.proyectoId,
        req.user.rol,
        req.user.id,
        req.params.archivoId,
      );
      res.status(200).json({ briefing });
    } catch (error) {
      next(error);
    }
  }
}

export const briefingController = new BriefingController();
