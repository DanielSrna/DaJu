import sharp from "sharp";
import {
  detectarTipoArchivo,
  optimizarImagen,
  TIPOS_ARCHIVO,
} from "../src/utils/archivos";

describe("detección por magic bytes", () => {
  it("detecta JPEG", () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    expect(detectarTipoArchivo(buffer)).toEqual({
      mimeType: TIPOS_ARCHIVO.jpeg,
      extension: "jpg",
    });
  });

  it("detecta PNG", () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectarTipoArchivo(buffer)).toEqual({
      mimeType: TIPOS_ARCHIVO.png,
      extension: "png",
    });
  });

  it("detecta WebP", () => {
    const buffer = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from("WEBP"),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
    ]);
    expect(detectarTipoArchivo(buffer)).toEqual({
      mimeType: TIPOS_ARCHIVO.webp,
      extension: "webp",
    });
  });

  it("detecta PDF", () => {
    const buffer = Buffer.from("%PDF-1.4 fake content");
    expect(detectarTipoArchivo(buffer)).toEqual({
      mimeType: TIPOS_ARCHIVO.pdf,
      extension: "pdf",
    });
  });

  it("rechaza contenido no permitido (ej. ejecutable disfrazado)", () => {
    const buffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00 executable");
    expect(detectarTipoArchivo(buffer)).toBeNull();
  });

  it("rechaza buffers vacíos o pequeños", () => {
    expect(detectarTipoArchivo(Buffer.alloc(0))).toBeNull();
    expect(detectarTipoArchivo(Buffer.from("abc"))).toBeNull();
  });
});

describe("optimización de imágenes con Sharp", () => {
  it("optimiza un PNG real y mantiene su formato", async () => {
    const png = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();

    const resultado = await optimizarImagen(png, TIPOS_ARCHIVO.png);
    expect(resultado.mimeType).toBe(TIPOS_ARCHIVO.png);
    expect(resultado.buffer.length).toBeGreaterThan(0);
    expect(detectarTipoArchivo(resultado.buffer)?.mimeType).toBe(TIPOS_ARCHIVO.png);
  });

  it("deja los PDFs intactos", async () => {
    const pdf = Buffer.from("%PDF-1.4 contenido");
    const resultado = await optimizarImagen(pdf, TIPOS_ARCHIVO.pdf);
    expect(resultado.buffer).toEqual(pdf);
    expect(resultado.extension).toBe("pdf");
  });
});
