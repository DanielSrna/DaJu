import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? "sin-request-id";

  if (error instanceof multer.MulterError) {
    const mensaje =
      error.code === "LIMIT_FILE_SIZE"
        ? "El archivo supera el tamaño máximo permitido (5 MB)"
        : `Error al subir el archivo: ${error.message}`;
    logger.fracaso(`Error de upload en ${req.method} ${req.originalUrl}`, {
      requestId,
      code: error.code,
    });
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: mensaje },
    });
    return;
  }

  if (error instanceof ApiError) {
    logger.fracaso(
      `Error controlado ${error.code} en ${req.method} ${req.originalUrl}`,
      {
        requestId,
        statusCode: error.statusCode,
        message: error.message,
      },
    );
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (
    error instanceof Error &&
    "name" in error &&
    error.name === "MongoServerError"
  ) {
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      logger.fracaso("Error de duplicidad de clave en MongoDB", { requestId });
      res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "El recurso ya existe (clave duplicada)",
        },
      });
      return;
    }
  }

  logger.fracaso("Error no controlado", {
    requestId,
    message: error instanceof Error ? error.message : "Error desconocido",
    stack: error instanceof Error ? error.stack : undefined,
  });

  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
  });
}
