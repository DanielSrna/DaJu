import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CatalogoFunciones } from "@/components/portal/catalogo-funciones";

const FUNCIONALIDAD = {
  id: "f1",
  nombre: "Blog integrado",
  descripcion: "Noticias y artículos",
  categoria: "pagina",
  complejidad: "media",
  precio: 40,
  activo: true,
};

function mockFetchPorRuta(rutas: Record<string, () => unknown>) {
  const fn = vi.fn((url: string | URL | Request, opciones?: RequestInit) => {
    const ruta = String(url).replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    const handler =
      rutas[`${(opciones?.method ?? "GET").toUpperCase()} ${ruta}`] ??
      rutas[ruta];
    if (!handler) {
      return Promise.reject(
        new Error(`Sin mock para ${opciones?.method ?? "GET"} ${ruta}`),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify(handler()), { status: 200 }),
    );
  });
  vi.stubGlobal("fetch", fn as unknown as typeof fetch);
  return fn;
}

describe("Catálogo de funciones en el entorno", () => {
  it("solicita una función predefinida con su precio sugerido", async () => {
    const fn = mockFetchPorRuta({
      "/api/v1/funcionalidades": () => ({
        funcionalidades: [FUNCIONALIDAD],
      }),
      "POST /api/v1/espacios/e1/solicitudes": () => ({
        solicitud: { id: "s1" },
      }),
    });

    render(
      <CatalogoFunciones
        familia="espacio"
        id="e1"
        onSolicitada={() => {}}
      />,
    );

    expect(await screen.findByText("Blog integrado")).toBeInTheDocument();
    expect(screen.getByText(/Media · \$40 USD/)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Solicitar Blog integrado/i }),
    );

    const llamada = fn.mock.calls.find((c) =>
      String(c[0]).includes("/api/v1/espacios/e1/solicitudes"),
    );
    expect(llamada).toBeDefined();
    expect(JSON.parse(String(llamada![1]?.body))).toMatchObject({
      titulo: "Blog integrado",
      costoSugerido: 40,
      origen: "catalogo",
    });
  });

  it("permite pedir una función personalizada", async () => {
    const fn = mockFetchPorRuta({
      "/api/v1/funcionalidades": () => ({ funcionalidades: [] }),
      "POST /api/v1/espacios/e1/solicitudes": () => ({
        solicitud: { id: "s2" },
      }),
    });

    render(
      <CatalogoFunciones
        familia="espacio"
        id="e1"
        onSolicitada={() => {}}
      />,
    );

    await userEvent.type(
      await screen.findByLabelText("Nombre de la función personalizada"),
      "Facturación electrónica",
    );
    await userEvent.type(
      screen.getByLabelText("Descripción de la función personalizada"),
      "Emitir facturas DIAN desde el panel",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Pedir función personalizada/i }),
    );

    const llamada = fn.mock.calls.find((c) =>
      String(c[0]).includes("/api/v1/espacios/e1/solicitudes"),
    );
    expect(JSON.parse(String(llamada![1]?.body))).toMatchObject({
      titulo: "Facturación electrónica",
      descripcion: "Emitir facturas DIAN desde el panel",
    });
  });
});
