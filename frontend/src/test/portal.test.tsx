import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppRoutes } from "@/app-rutas";
import { PanelChat } from "@/components/portal/panel-chat";

function mockFetchPorRuta(rutas: Record<string, () => unknown>) {
  const fn = vi.fn((url: string | URL | Request, opciones?: RequestInit) => {
    const ruta = String(url).replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    const handler = rutas[`${(opciones?.method ?? "GET").toUpperCase()} ${ruta}`] ?? rutas[ruta];
    if (!handler) return Promise.reject(new Error(`Sin mock para ${opciones?.method ?? "GET"} ${ruta}`));
    return Promise.resolve(
      new Response(JSON.stringify(opciones?.method === "DELETE" ? {} : handler()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
  vi.stubGlobal("fetch", fn as unknown as typeof fetch);
  return fn;
}

describe("Portal del cliente", () => {
  it("bloquea con blur las zonas no compradas y muestra el aviso", async () => {
    mockFetchPorRuta({
      "/api/v1/auth/me": () => ({ user: { id: "1", email: "c@c.com", nombre: "Carlos", rol: "cliente" } }),
      "/api/v1/cliente/resumen": () => ({
        proyectos: [
          { id: "p1", nombre: "Paquete Validor", slug: "validor", estado: "Diseño", fechaEntrega: null, progreso: 0.33 },
        ],
        espacios: [],
        pagos: [],
      }),
    });

    render(
      <MemoryRouter initialEntries={["/cliente"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Paquete Validor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al proyecto" })).toBeInTheDocument();
    expect(screen.getAllByText(/este entorno es específico a/i)).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Ir a productos" })).toHaveLength(2);  });

  it("el chat lista y envía mensajes del contexto", async () => {
    const fn = mockFetchPorRuta({
      "GET /api/v1/mensajes": () => ({ mensajes: [] }),
      "POST /api/v1/mensajes": () => ({ mensaje: { id: "m1" } }),
    });

    render(
      <MemoryRouter>
        <PanelChat contexto="espacio" contextoId="abc" />
      </MemoryRouter>,
    );

    const usuario = userEvent.setup();
    await waitFor(() =>
      expect(screen.getByText(/sin mensajes todavía/i)).toBeInTheDocument(),
    );
    await usuario.type(screen.getByLabelText("Escribe un mensaje"), "¿Cuándo está el mockup?");
    await usuario.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    await waitFor(() =>
      expect(fn).toHaveBeenCalledWith(
        "/api/v1/mensajes",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("el entorno de consultoría propone una cita con la franja elegida", async () => {
    const fn = mockFetchPorRuta({
      "/api/v1/auth/me": () => ({ user: { id: "1", email: "c@c.com", nombre: "Carlos", rol: "cliente" } }),
      "/api/v1/espacios/e1": () => ({
        espacio: { id: "e1", clienteId: "1", tipoProducto: "servicio", productoSlug: "asesoria-tecnica", pagoId: "x", estado: "activo", sesiones: { total: 2, usadas: 0 } },
      }),
      "GET /api/v1/espacios/e1/citas": () => ({ citas: [] }),
      "POST /api/v1/espacios/e1/citas": () => ({ cita: { id: "c1" } }),
    });

    render(
      <MemoryRouter initialEntries={["/cliente/servicios/e1/citas"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    const usuario = userEvent.setup();
    const fecha = await screen.findByLabelText("Franja 1 · fecha");
    await usuario.selectOptions(fecha, "2026-09-20");
    await usuario.selectOptions(screen.getByLabelText("Franja 1 · hora"), "15:00");
    await usuario.click(screen.getByRole("button", { name: "Enviar propuesta" }));

    await waitFor(() =>
      expect(fn).toHaveBeenCalledWith(
        "/api/v1/espacios/e1/citas",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const llamada = fn.mock.calls.find(
      (c) => String(c[0]).includes("/citas") && String(c[1]?.method) === "POST",
    );
    const cuerpo = JSON.parse(String(llamada![1]?.body));
    expect(cuerpo.propuestas).toHaveLength(1);
  });
});
