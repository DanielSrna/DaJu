import { describe, expect, it, vi, beforeEach } from "vitest";
import { api } from "@/lib/api/cliente";

beforeEach(() => vi.restoreAllMocks());

describe("Cliente API de publicaciones (admin)", () => {
  it("crearPublicacion hace POST /publicaciones con el cuerpo", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ publicacion: { id: "7" } }), { status: 201 })),
    ) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await api.crearPublicacion({
      titulo: "Nueva entrada",
      tipo: "concepto",
      resumen: "Resumen de prueba bien largo",
      contenido: "Contenido completo de la entrada que cumple el mínimo",
      secciones: ["inicio"],
      publicado: false,
    });

    const llamada = fetchMock.mock.calls[0];
    expect(String(llamada[0])).toContain("/api/v1/publicaciones");
    expect(llamada[1]?.method).toBe("POST");
    expect(JSON.parse(String(llamada[1]?.body)).titulo).toBe("Nueva entrada");
  });

  it("actualizarPublicacion hace PUT al id y eliminarPublicacion DELETE", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response("{}", { status: 200 })),
    ) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await api.actualizarPublicacion("abc", { publicado: true });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/publicaciones/abc");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PUT");

    await api.eliminarPublicacion("abc");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/v1/publicaciones/abc");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
  });
});
