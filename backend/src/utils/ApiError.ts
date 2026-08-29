export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYMENT_REQUIRED"
  | "INTERNAL_ERROR"
  | "RATE_LIMITED";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static validation(message: string, details?: unknown): ApiError {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "No autenticado"): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "No tienes permisos"): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Recurso no encontrado"): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static paymentRequired(message: string): ApiError {
    return new ApiError(402, "PAYMENT_REQUIRED", message);
  }

  static internal(message = "Error interno del servidor"): ApiError {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}
