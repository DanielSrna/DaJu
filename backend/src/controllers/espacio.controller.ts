import { NextFunction, Request, Response } from "express";
import { espacioService } from "../services/espacio.service";
import { citaService } from "../services/cita.service";
import { vistaDisenoService } from "../services/vista-diseno.service";
import { solicitudFuncionService } from "../services/solicitud-funcion.service";
import { ApiError } from "../utils/ApiError";

export class EspacioController {
  async obtener(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const espacio =
        req.user!.rol === "admin"
          ? await espacioService.obtenerPorIdAdmin(req.params.id)
          : await espacioService.obtenerPropio(req.params.id, req.user!.id);
      res.status(200).json({ espacio });
    } catch (error) {
      next(error);
    }
  }

  async listarCitas(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const citas = await citaService.listar(
        req.params.id,
        req.user!.rol === "cliente" ? req.user!.id : undefined,
      );
      res.status(200).json({ citas });
    } catch (error) {
      next(error);
    }
  }

  async proponerCita(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        propuestas = [],
        duracionMin,
        canal,
      } = req.body as {
        propuestas: string[];
        duracionMin?: number;
        canal?: "Meet" | "Zoom";
      };
      const fechas = propuestas
        .map((p) => new Date(p))
        .filter((f) => !Number.isNaN(f.getTime()));
      if (!fechas.length || fechas.length > 2) {
        throw ApiError.validation(
          "Necesitas proponer entre 1 y 2 franjas válidas",
        );
      }
      const cita = await citaService.proponer(req.params.id, req.user!.id, {
        propuestas: fechas,
        duracionMin: Number(duracionMin ?? 60),
        canal: canal ?? "Meet",
      });
      res.status(201).json({ cita });
    } catch (error) {
      next(error);
    }
  }

  async listarVistas(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const vistas = await vistaDisenoService.listar(
        req.params.id,
        req.user!.rol === "cliente" ? req.user!.id : undefined,
      );
      res.status(200).json({ vistas });
    } catch (error) {
      next(error);
    }
  }

  async crearVista(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { nombre } = req.body as { nombre: string };
      if (!nombre?.trim())
        throw ApiError.validation("El nombre es obligatorio");
      const vista = await vistaDisenoService.crear(req.params.id, {
        nombre: nombre.trim(),
      });
      res.status(201).json({ vista });
    } catch (error) {
      next(error);
    }
  }

  async actualizarVista(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { estado, nombre, orden } = req.body as {
        estado?: "pendiente" | "negociacion" | "aprobada";
        nombre?: string;
        orden?: number;
      };
      const vista = await vistaDisenoService.actualizar(req.params.vistaId, {
        ...(estado ? { estado } : {}),
        ...(nombre ? { nombre } : {}),
        ...(typeof orden === "number" ? { orden } : {}),
      });
      res.status(200).json({ vista });
    } catch (error) {
      next(error);
    }
  }

  async subirObraGris(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ninguna imagen (campo 'imagen')",
        );
      }
      const vista = await vistaDisenoService.subirObraGris(req.params.vistaId, {
        buffer: req.file.buffer,
        nombre: req.file.originalname,
      });
      res.status(200).json({ vista });
    } catch (error) {
      next(error);
    }
  }

  async subirMuestraCliente(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ninguna imagen (campo 'imagen')",
        );
      }
      const vista = await vistaDisenoService.subirMuestraCliente(
        req.params.vistaId,
        { buffer: req.file.buffer, nombre: req.file.originalname },
      );
      res.status(200).json({ vista });
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
      if (!req.file) {
        throw ApiError.validation(
          "No se recibió ningún archivo (campo 'archivo')",
        );
      }
      const vista = await vistaDisenoService.agregarArchivo(
        req.params.vistaId,
        { buffer: req.file.buffer, nombre: req.file.originalname },
        req.user!.rol === "cliente" ? req.user!.id : undefined,
      );
      res.status(201).json({ vista });
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
      const vista = await vistaDisenoService.eliminarArchivo(
        req.params.vistaId,
        req.params.archivoId,
        req.user!.rol === "cliente" ? req.user!.id : undefined,
      );
      res.status(200).json({ vista });
    } catch (error) {
      next(error);
    }
  }

  async listarSolicitudesProyecto(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const solicitudes = await solicitudFuncionService.listar(
        { proyectoId: req.params.id },
        req.user!.rol === "cliente" ? req.user!.id : undefined,
      );
      res.status(200).json({ solicitudes });
    } catch (error) {
      next(error);
    }
  }

  async listarSolicitudes(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const solicitudes = await solicitudFuncionService.listar(
        { espacioId: req.params.id },
        req.user!.rol === "cliente" ? req.user!.id : undefined,
      );
      res.status(200).json({ solicitudes });
    } catch (error) {
      next(error);
    }
  }

  async crearSolicitud(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { titulo, descripcion } = req.body as {
        titulo: string;
        descripcion: string;
      };
      if (!titulo?.trim() || !descripcion?.trim()) {
        throw ApiError.validation("Título y descripción son obligatorios");
      }
      const solicitud = await solicitudFuncionService.crear(
        { espacioId: req.params.id },
        req.user!.id,
        { titulo: titulo.trim(), descripcion: descripcion.trim() },
      );
      res.status(201).json({ solicitud });
    } catch (error) {
      next(error);
    }
  }

  async responderSolicitud(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { costo, respuestaAdmin } = req.body as {
        costo: number;
        respuestaAdmin: string;
      };
      if (!respuestaAdmin?.trim()) {
        throw ApiError.validation("La respuesta es obligatoria");
      }
      const solicitud = await solicitudFuncionService.responder(
        req.params.solicitudId,
        req.user!.id,
        { costo: Number(costo ?? 0), respuestaAdmin: respuestaAdmin.trim() },
      );
      res.status(200).json({ solicitud });
    } catch (error) {
      next(error);
    }
  }

  async aceptarSolicitud(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { pagoService } = await import("../services/pago.service");
      const resultado = await pagoService.checkoutSolicitud(
        req.params.solicitudId,
        req.user!.id,
      );
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }
}

export const espacioController = new EspacioController();
