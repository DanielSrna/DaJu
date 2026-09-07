import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TopBar } from "@/components/layout/navegacion";
import { ModoEdicionProvider } from "@/lib/modo-edicion";

function renderTopBar(rol: "admin" | "cliente" | null) {
  if (rol) {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "1", email: "x@y.com", rol, nombre: "U" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;
  } else {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: {} }), { status: 401 }),
    ) as unknown as typeof fetch;
  }
  return render(
    <MemoryRouter>
      <ModoEdicionProvider>
        <TopBar />
      </ModoEdicionProvider>
    </MemoryRouter>,
  );
}

describe("TopBar con admin", () => {
  it("visitante ve el acceso de sesión normal", async () => {
    renderTopBar(null);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /iniciar sesión/i })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/bienvenido administrador/i)).not.toBeInTheDocument();
  });

  it("admin ve 'Bienvenido Administrador', botones Edición/Desarrollo y Cerrar sesión", async () => {
    renderTopBar("admin");
    await waitFor(() =>
      expect(screen.getByText(/bienvenido administrador/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /edición/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /desarrollo/i })).toHaveAttribute("href", "/cliente");
    expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it("cliente conectado ve su saludo y cerrar sesión, pero NO el modo edición", async () => {
    renderTopBar("cliente");
    await waitFor(() => expect(screen.getByText(/hola, u/i)).toBeInTheDocument());
    expect(screen.queryByText(/bienvenido administrador/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /iniciar sesión/i })).not.toBeInTheDocument();
  });

  it("al pulsar Cerrar sesión se llama a /auth/logout y vuelve la vista de visitante", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ user: { id: "1", email: "x@y.com", rol: "admin", nombre: "U" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      )
      .mockResolvedValue(
        new Response(JSON.stringify({ error: {} }), { status: 401 }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <MemoryRouter>
        <ModoEdicionProvider>
          <TopBar />
        </ModoEdicionProvider>
      </MemoryRouter>,
    );

    const usuario = userEvent.setup();
    await waitFor(() =>
      expect(screen.getByText(/bienvenido administrador/i)).toBeInTheDocument(),
    );
    await usuario.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /iniciar sesión/i })).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.queryByText(/bienvenido administrador/i)).not.toBeInTheDocument();
  });
});
