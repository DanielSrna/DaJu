/**
 * Contrato de almacenamiento de archivos (logos, PDFs de briefing).
 * NUNCA importar Cloudinary/S3 directamente fuera de la implementación.
 *
 * Implementaciones: CloudinaryStorageProvider / S3StorageProvider — por implementar.
 */
export interface StoredFile {
  url: string;
  publicId: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StorageProvider {
  upload(params: {
    buffer: Buffer;
    mimeType: string;
    folder: string;
  }): Promise<StoredFile>;
  delete(publicId: string): Promise<void>;
  getSignedUrl(publicId: string, expiresInSeconds?: number): Promise<string>;
}
