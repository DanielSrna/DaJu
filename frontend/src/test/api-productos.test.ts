import { describe, expect, it, vi, beforeEach } from "vitest";
import { api } from "@/lib/api/cliente";

beforeEach(() => vi.restoreAllMocks());

describe("Cliente API de administración de productos", () => {
  it("crearPaquete hace POST /paquetes con el cuerpo correcto", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ paquete: { id: "x" } }), { status: 201 })),
    ) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await api.crearPaquete({
      nombre: "Paquete Prueba",
      slug: "paquete-prueba",
      tipo: "validor",
      descripcion: "Descripción prueba",
      precio: 199,
      moneda: "USD",
      vistasIncluidas: 1,
      soporteMeses: 2,
      diasEntrega: 10,
    });

    const call = fetchMock.mock.calls[0];
    expect(String(call[0])).toContain("/api/v1/paquetes");
    expect(call[1]?.method).toBe("POST");
    const body = JSON.parse(String(call[1]?.body));
    expect(body).toEqual({
      nombre: "Paquete Prueba",
      slug: "paquete-prueba",
      tipo: "validor",
      descripcion: "Descripción prueba",
      precio: 199,
      moneda: "USD",
      vistasIncluidas: 1,
      soporteMeses: 2,
      diasEntrega: 10,
    });
  });

  it("actualizarPaquete hace PUT al id", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ paquete: { id: "abc123" } }), { status: 200 })),
    ) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await api.actualizarPaquete("abc123", { precio: 220 });

    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/paquetes/abc123");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PUT");
  });

  it("subirImagenGaleria usa FormData (multipart) al endpoint /galeria", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ item: {} }), { status: 200 })),
    ) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const blob = new Blob(["foto"], { type: "image/png" });
    await api.subirImagenGaleria("abc123", blob);

    const call = fetchMock.mock.calls[0];
    expect(String(call[0])).toContain("/api/v1/paquetes/abc123/galeria");
    expect(call[1]?.method).toBe("POST");
    expect(call[1]?.body).toBeInstanceOf(FormData);
    expect((call[1]?.body as FormData).has("imagen")).toBe(true);
  });
});
