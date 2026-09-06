import { render, screen, waitFor } from "@testing-library/react";
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

  it("admin ve 'Bienvenido Administrador' con botones Edición y Desarrollo", async () => {
    renderTopBar("admin");
    await waitFor(() =>
      expect(screen.getByText(/bienvenido administrador/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /edición/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /desarrollo/i })).toHaveAttribute("href", "/admin");
  });

  it("cliente NO ve el modo edición", async () => {
    renderTopBar("cliente");
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /iniciar sesión/i })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/bienvenido administrador/i)).not.toBeInTheDocument();
  });
});
