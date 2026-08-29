import { logger } from "../config/logger";

export interface HealthStatus {
  estado: "ok";
  uptime: number;
  timestamp: string;
  version: string;
}

export class HealthService {
  async getStatus(): Promise<HealthStatus> {
    logger.proceso("Consultando estado del servicio");
    const status: HealthStatus = {
      estado: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
    };
    logger.exito("Estado del servicio consultado");
    return status;
  }
}

export const healthService = new HealthService();
