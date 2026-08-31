import { v2 as cloudinary } from "cloudinary";
import { env } from "../../../config/env";
import { ApiError } from "../../../utils/ApiError";
import { StorageProvider, StoredFile } from "../storage-provider.interface";
import { logger } from "../../../config/logger";

/**
 * Adaptador de almacenamiento en Cloudinary (ver ADR / StorageProvider).
 * Guarda logos, imágenes del carrusel y PDFs del briefing.
 */
export class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
  }

  private assertConfigured(): void {
    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      !env.CLOUDINARY_API_KEY ||
      !env.CLOUDINARY_API_SECRET
    ) {
      throw ApiError.internal("Cloudinary no está configurado (CLOUDINARY_*)");
    }
  }

  async upload(params: {
    buffer: Buffer;
    mimeType: string;
    folder: string;
  }): Promise<StoredFile> {
    this.assertConfigured();
    logger.proceso("CloudinaryStorageProvider.upload", {
      folder: params.folder,
    });

    const dataUri = `data:${params.mimeType};base64,${params.buffer.toString("base64")}`;

    try {
      const resultado = await cloudinary.uploader.upload(dataUri, {
        folder: params.folder,
        resource_type: params.mimeType === "application/pdf" ? "raw" : "image",
        use_filename: true,
        unique_filename: true,
      });

      logger.exito("CloudinaryStorageProvider.upload completado", {
        publicId: resultado.public_id,
      });
      return {
        url: resultado.secure_url,
        publicId: resultado.public_id,
        sizeBytes: params.buffer.length,
        mimeType: params.mimeType,
      };
    } catch (error) {
      logger.fracaso("CloudinaryStorageProvider.upload falló", {
        error: (error as Error).message,
      });
      throw ApiError.internal("No se pudo subir el archivo a Cloudinary");
    }
  }

  async delete(publicId: string): Promise<void> {
    this.assertConfigured();
    logger.proceso("CloudinaryStorageProvider.delete", { publicId });

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      logger.exito("CloudinaryStorageProvider.delete completado", { publicId });
    } catch (error) {
      logger.fracaso("CloudinaryStorageProvider.delete falló", {
        error: (error as Error).message,
      });
    }
  }

  async getSignedUrl(
    publicId: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    this.assertConfigured();
    const url = cloudinary.url(publicId, {
      sign_url: true,
      type: "authenticated",
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    });
    return url;
  }
}
