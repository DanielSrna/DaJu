import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VistasSugeridas } from "@/components/portal/vistas-sugeridas";

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

describe("Vistas sugeridas", () => {
  it("pide confirmación antes de agregar una vista sugerida", async () => {
    const fn = mockFetchPorRuta({
      "POST /api/v1/briefing/p1/vistas": () => ({ briefing: {} }),
    });

    render(
      <VistasSugeridas
        familia="proyecto"
        id="p1"
        existentes={["Inicio"]}
        onCreada={() => {}}
      />,
    );

    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole("button", { name: /^Servicios$/ }));

    expect(
      screen.getByText(/¿Seguro que quieres agregar la vista/i),
    ).toBeInTheDocument();
    // Aún no se ha creado nada.
    expect(
      fn.mock.calls.filter((c) => String(c[0]).includes("/vistas")).length,
    ).toBe(0);

    await usuario.click(screen.getByRole("button", { name: /Sí, agregar/i }));

    const llamada = fn.mock.calls.find((c) =>
      String(c[0]).includes("/api/v1/briefing/p1/vistas"),
    );
    expect(llamada).toBeDefined();
    expect(JSON.parse(String(llamada![1]?.body))).toMatchObject({
      nombre: "Servicios",
    });
  });

  it("permite pedir una vista personalizada con descripción", async () => {
    const fn = mockFetchPorRuta({
      "POST /api/v1/espacios/e1/vistas": () => ({ vista: { id: "v1" } }),
    });

    render(
      <VistasSugeridas
        familia="espacio"
        id="e1"
        existentes={[]}
        onCreada={() => {}}
      />,
    );

    const usuario = userEvent.setup();
    await usuario.type(
      screen.getByLabelText("Nombre de la vista personalizada"),
      "Mapa de sedes",
    );
    await usuario.type(
      screen.getByLabelText("Descripción de la vista personalizada"),
      "Mostrar sedes en un mapa con horarios",
    );
    await usuario.click(
      screen.getByRole("button", { name: /Pedir vista personalizada/i }),
    );

    const llamada = fn.mock.calls.find((c) =>
      String(c[0]).includes("/api/v1/espacios/e1/vistas"),
    );
    expect(llamada).toBeDefined();
    expect(JSON.parse(String(llamada![1]?.body))).toMatchObject({
      nombre: "Mapa de sedes",
      descripcion: "Mostrar sedes en un mapa con horarios",
    });
  });
});
