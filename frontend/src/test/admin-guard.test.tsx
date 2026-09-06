import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "@/app-rutas";

function mockSesion(rol: "admin" | "cliente" | null, extra?: Record<string, unknown>) {
  global.fetch = vi.fn((url: string) => {
    const u = String(url);
    if (u.includes("/auth/me")) {
      if (!rol) return Promise.resolve(new Response("{}", { status: 401 }));
      return Promise.resolve(
        new Response(JSON.stringify({ user: { id: "1", email: "x@y.com", rol, nombre: "U" } }), { status: 200 }),
      );
    }
    if (u.includes("/cms/editor") || u.includes("/cms/publicar") || u.includes("/cms")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            logo: null,
            colores: { primario: "#0F1B2D", secundario: "#F8FAFC", acento: "#F59E0B" },
            marquesina: { texto: "", activo: false },
            carrusel: [],
            textos: {},
            descuento: { activo: false, porcentaje: 20, mensaje: "", hasta: null },
            diasExtra: 0,
            publicado: {},
            editor: {},
          }),
          { status: 200 },
        ),
      );
    }
    if (u.includes("/paquetes")) {
      return Promise.resolve(
        new Response(JSON.stringify({ paquetes: extra?.paquetes ?? [], paquete: extra?.paquete }), { status: 200 }),
      );
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  }) as unknown as typeof fetch;
}

describe("Guardia de rutas admin", () => {
  it("visitante es redirigido al login si intenta entrar a /admin/productos", async () => {
    mockSesion(null);
    render(
      <MemoryRouter initialEntries={["/admin/productos"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Inicia sesión" })).toBeInTheDocument(),
    );
  });

  it("admin puede entrar a la lista de productos", async () => {
    mockSesion("admin", {
      paquetes: [
        {
          id: "1",
          nombre: "Paquete Validor",
          slug: "validor",
          tipo: "validor",
          descripcion: "Landing de 1 vista",
          precio: 199,
          moneda: "USD",
          vistasIncluidas: 1,
          soporteMeses: 2,
          diasEntrega: 10,
          features: [],
          imagen: null,
          galeria: [],
          detalles: [],
          activo: true,
        },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/admin/productos"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /productos administrados/i })).toBeInTheDocument(),
    );
  });

  it("cliente NO entra a /admin/productos (ve el login)", async () => {
    mockSesion("cliente");
    render(
      <MemoryRouter initialEntries={["/admin/productos"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Inicia sesión" })).toBeInTheDocument(),
    );
    expect(screen.queryByText("Zona en construcción")).not.toBeInTheDocument();
  });
});
