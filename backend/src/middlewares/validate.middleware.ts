import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError";

export function validate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(
      ApiError.validation("Datos inválidos en la petición", {
        campos: errors.array().map((e) => ({
          campo: e.type === "field" ? e.path : e.type,
          mensaje: e.msg,
        })),
      }),
    );
    return;
  }
  next();
}
