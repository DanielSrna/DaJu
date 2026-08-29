import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";

async function bootstrap(): Promise<void> {
  logger.proceso("Iniciando servidor MainPlataform API");
  try {
    const app = createApp();

    if (env.NODE_ENV !== "test") {
      await connectDatabase();
    }

    const server = app.listen(env.PORT, () => {
      logger.exito(`API escuchando en http://localhost:${env.PORT}`, {
        entorno: env.NODE_ENV,
        docs: `http://localhost:${env.PORT}/api-docs`,
      });
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.proceso(`Recibida señal ${signal}, cerrando servidor`);
      server.close(async () => {
        await disconnectDatabase();
        logger.exito("Servidor cerrado correctamente");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (error) {
    logger.fracaso("Fallo al iniciar el servidor", {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

void bootstrap();
