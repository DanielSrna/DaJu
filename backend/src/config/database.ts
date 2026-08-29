import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

export async function connectDatabase(): Promise<void> {
  logger.proceso("Conectando a MongoDB", {
    uri: env.MONGODB_URI.replace(/\/\/[^@]+@/, "//***@"),
  });
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.exito("Conexión a MongoDB establecida");
  } catch (error) {
    logger.fracaso("Error conectando a MongoDB", {
      error: (error as Error).message,
    });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  logger.proceso("Desconectando de MongoDB");
  await mongoose.disconnect();
  logger.exito("Desconexión de MongoDB completada");
}
