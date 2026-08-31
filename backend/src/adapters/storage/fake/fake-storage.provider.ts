import { randomUUID } from "crypto";
import { StorageProvider, StoredFile } from "../storage-provider.interface";

/**
 * Almacenamiento simulado en memoria para entorno de TEST.
 * Misma interfaz y comportamiento que Cloudinary pero sin red.
 */
export class FakeStorageProvider implements StorageProvider {
  private readonly archivos = new Map<
    string,
    { buffer: Buffer; mimeType: string }
  >();

  async upload(params: {
    buffer: Buffer;
    mimeType: string;
    folder: string;
  }): Promise<StoredFile> {
    const publicId = `${params.folder}/${randomUUID()}`;
    this.archivos.set(publicId, {
      buffer: params.buffer,
      mimeType: params.mimeType,
    });
    return {
      url: `https://fake-storage.test/${publicId}`,
      publicId,
      sizeBytes: params.buffer.length,
      mimeType: params.mimeType,
    };
  }

  async delete(publicId: string): Promise<void> {
    this.archivos.delete(publicId);
  }

  async getSignedUrl(
    publicId: string,
    _expiresInSeconds?: number,
  ): Promise<string> {
    return `https://fake-storage.test/signed/${publicId}`;
  }

  getArchivos(): Map<string, { buffer: Buffer; mimeType: string }> {
    return this.archivos;
  }
}
