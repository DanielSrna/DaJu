import sharp from "sharp";

/**
 * Tipos de archivo permitidos en el briefing.
 * Detectados por MAGIC BYTES (nunca por extensión/nombre: un .exe disfrazado de .pdf
 * se rechaza aquí). Verificación con el contenido real del buffer.
 */
export const TIPOS_ARCHIVO = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
} as const;

export type TipoArchivo = (typeof TIPOS_ARCHIVO)[keyof typeof TIPOS_ARCHIVO];

export const TAMANO_MAX_ARCHIVO = 5 * 1024 * 1024; // 5 MB
export const TIPOS_IMAGEN: TipoArchivo[] = [
  TIPOS_ARCHIVO.jpeg,
  TIPOS_ARCHIVO.png,
  TIPOS_ARCHIVO.webp,
];

export interface ArchivoDetectado {
  mimeType: TipoArchivo;
  extension: string;
}

/** Detecta el tipo real por los primeros bytes del archivo. */
export function detectarTipoArchivo(buffer: Buffer): ArchivoDetectado | null {
  if (!buffer || buffer.length < 8) return null;

  const esJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (esJpeg) return { mimeType: TIPOS_ARCHIVO.jpeg, extension: "jpg" };

  const esPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  if (esPng) return { mimeType: TIPOS_ARCHIVO.png, extension: "png" };

  const esWebp =
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";
  if (esWebp) return { mimeType: TIPOS_ARCHIVO.webp, extension: "webp" };

  const esPdf = buffer.toString("ascii", 0, 5) === "%PDF-";
  if (esPdf) return { mimeType: TIPOS_ARCHIVO.pdf, extension: "pdf" };

  return null;
}

/**
 * Optimiza una imagen con Sharp: rota según EXIF, limita a 2000px y
 * comprime sin pérdida visual perceptible. Los PDF se devuelven sin cambios.
 */
export async function optimizarImagen(
  buffer: Buffer,
  mimeType: TipoArchivo,
): Promise<{ buffer: Buffer; mimeType: TipoArchivo; extension: string }> {
  if (mimeType === TIPOS_ARCHIVO.pdf) {
    return { buffer, mimeType, extension: "pdf" };
  }

  let pipeline = sharp(buffer)
    .rotate()
    .resize({ width: 2000, withoutEnlargement: true });

  if (mimeType === TIPOS_ARCHIVO.jpeg) {
    pipeline = pipeline.jpeg({ quality: 80 });
  } else if (mimeType === TIPOS_ARCHIVO.png) {
    pipeline = pipeline.png({ compressionLevel: 8 });
  } else {
    pipeline = pipeline.webp({ quality: 80 });
  }

  const resultado = await pipeline.toBuffer();
  return {
    buffer: resultado,
    mimeType,
    extension: mimeTypeToExtension(mimeType),
  };
}

export function mimeTypeToExtension(mimeType: TipoArchivo): string {
  const map: Record<TipoArchivo, string> = {
    [TIPOS_ARCHIVO.jpeg]: "jpg",
    [TIPOS_ARCHIVO.png]: "png",
    [TIPOS_ARCHIVO.webp]: "webp",
    [TIPOS_ARCHIVO.pdf]: "pdf",
  };
  return map[mimeType];
}
