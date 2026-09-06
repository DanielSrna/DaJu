import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ModoEdicionProvider, useModoEdicion } from "@/lib/modo-edicion";

beforeEach(() => {
  vi.restoreAllMocks();
});

function Consumidor() {
  const { modoEdicion, cargando, usuario } = useModoEdicion();
  return (
    <div>
      <output data-testid="cargando">{String(cargando)}</output>
      <output data-testid="modo">{String(modoEdicion)}</output>
      <output data-testid="rol">{String(usuario?.rol ?? "null")}</output>
    </div>
  );
}

function renderHub() {
  return render(
    <MemoryRouter>
      <ModoEdicionProvider>
        <Consumidor />
      </ModoEdicionProvider>
    </MemoryRouter>,
  );
}

describe("ModoEdicion (solo admin)", () => {
  it("sin sesión → modo edición inactivo", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHORIZED" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    renderHub();
    await waitFor(() => expect(screen.getByTestId("cargando").textContent).toBe("false"));
    expect(screen.getByTestId("modo").textContent).toBe("false");
    expect(screen.getByTestId("rol").textContent).toBe("null");
  });

  it("con admin logueado → modo edición activo", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ user: { id: "1", email: "a@d.com", rol: "admin", nombre: "Admin" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as typeof fetch;

    renderHub();
    await waitFor(() => expect(screen.getByTestId("cargando").textContent).toBe("false"));
    expect(screen.getByTestId("modo").textContent).toBe("true");
    expect(screen.getByTestId("rol").textContent).toBe("admin");
  });

  it("con cliente logueado → modo edición inactivo", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ user: { id: "2", email: "c@d.com", rol: "cliente", nombre: "Cliente" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as typeof fetch;

    renderHub();
    await waitFor(() => expect(screen.getByTestId("cargando").textContent).toBe("false"));
    expect(screen.getByTestId("modo").textContent).toBe("false");
  });
});
