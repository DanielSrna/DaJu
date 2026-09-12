import { NextFunction, Request, Response } from "express";
import { cotizacionService } from "../services/cotizacion.service";
import { authService } from "../services/auth.service";
import { setAuthCookies } from "./auth.controller";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";
import type { TipoProducto } from "../services/producto.service";

export class CotizacionController {
  async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.proceso("CotizacionController.crear");
    try {
      const {
        tipoProducto,
        paqueteId,
        productoId,
        email,
        nombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        fechaNacimiento,
        aceptaCondiciones,
        aceptaDatos,
        password,
      } = req.body;
      const params: {
        tipoProducto?: TipoProducto;
        paqueteId?: string;
        productoId?: string;
        email: string;
        nombre?: string;
        segundoNombre?: string;
        primerApellido?: string;
        segundoApellido?: string;
        fechaNacimiento?: string;
        aceptaCondiciones?: boolean;
        aceptaDatos?: boolean;
        password?: string;
      } = { email };
      if (
        typeof tipoProducto === "string" &&
        ["paquete", "plantilla", "servicio"].includes(tipoProducto)
      ) {
        params.tipoProducto = tipoProducto as TipoProducto;
      }
      if (typeof paqueteId === "string") params.paqueteId = paqueteId;
      if (typeof productoId === "string") params.productoId = productoId;
      if (typeof nombre === "string") params.nombre = nombre;
      if (typeof segundoNombre === "string")
        params.segundoNombre = segundoNombre;
      if (typeof primerApellido === "string")
        params.primerApellido = primerApellido;
      if (typeof segundoApellido === "string")
        params.segundoApellido = segundoApellido;
      if (typeof fechaNacimiento === "string")
        params.fechaNacimiento = fechaNacimiento;
      if (typeof aceptaCondiciones === "boolean")
        params.aceptaCondiciones = aceptaCondiciones;
      if (typeof aceptaDatos === "boolean") params.aceptaDatos = aceptaDatos;
      if (typeof password === "string") params.password = password;

      const resultado = await cotizacionService.crear(params);
      const { tokens } = await authService.emitirSesion(resultado.usuario.id);
      setAuthCookies(res, tokens);
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  /** Cliente con sesión activa: adquiere otro producto sin registrarse de nuevo. */
  async crearComoCliente(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    logger.proceso("CotizacionController.crearComoCliente");
    try {
      if (!req.user) throw ApiError.unauthorized();
      const { tipoProducto, paqueteId, productoId } = req.body;
      const params: {
        tipoProducto?: TipoProducto;
        paqueteId?: string;
        productoId?: string;
      } = {};
      if (
        typeof tipoProducto === "string" &&
        ["paquete", "plantilla", "servicio"].includes(tipoProducto)
      ) {
        params.tipoProducto = tipoProducto as TipoProducto;
      }
      if (typeof paqueteId === "string") params.paqueteId = paqueteId;
      if (typeof productoId === "string") params.productoId = productoId;

      const resultado = await cotizacionService.crearParaCliente(
        req.user.id,
        params,
      );
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }
}

export const cotizacionController = new CotizacionController();
