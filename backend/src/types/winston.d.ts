declare module "winston" {
  interface Logger {
    proceso(message: string, meta?: Record<string, unknown>): Logger;
    exito(message: string, meta?: Record<string, unknown>): Logger;
    fracaso(message: string, meta?: Record<string, unknown>): Logger;
  }
}

export {};
