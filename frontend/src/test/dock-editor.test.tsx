import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TemaProvider } from "@/lib/tema";
import { ModoEdicionProvider } from "@/lib/modo-edicion";
import { DockEditor } from "@/components/editor/dock-editor";

function mockFetch() {
  global.fetch = vi.fn((url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/auth/me")) {
      return Promise.resolve(
        new Response(JSON.stringify({ usuario: { id: "1", email: "a@d.com", rol: "admin", nombre: "A" } }), { status: 200 }),
      );
    }
    if (u.includes("/cms/editor") && init?.method === "PATCH") {
      return Promise.resolve(new Response(JSON.stringify({ editor: JSON.parse(String(init.body)) }), { status: 200 }));
    }
    if (u.includes("/cms/publicar")) {
      return Promise.resolve(new Response(JSON.stringify({ publicado: {} }), { status: 200 }));
    }
    // GET /cms
    return Promise.resolve(
      new Response(
        JSON.stringify({
          logo: null,
          colores: { primario: "#123456", secundario: "#123456", acento: "#abcdef" },
          marquesina: { texto: "Hola", activo: false },
          carrusel: [],
          textos: {},
          descuento: { activo: false, porcentaje: 20, mensaje: "", hasta: null },
          diasExtra: 0,
        }),
        { status: 200 },
      ),
    );
  }) as unknown as typeof fetch;
}

function renderDock() {
  return render(
    <MemoryRouter>
      <ModoEdicionProvider>
        <TemaProvider>
          <DockEditor />
        </TemaProvider>
      </ModoEdicionProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.restoreAllMocks());

describe("DockEditor", () => {
  it("el admin ve el dock con publicar y deshacer", async () => {
    mockFetch();
    renderDock();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /panel/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /panel/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /publicar cambios/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /deshacer/i })).toBeInTheDocument();
  });

  it("cambiar la marquesina hace PATCH al editor", async () => {
    mockFetch();
    renderDock();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /panel/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /panel/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/mensaje de la barra/i)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/mensaje de la barra/i), { target: { value: "🎄 Anuncio" } });
    fireEvent.blur(screen.getByLabelText(/mensaje de la barra/i));

    await waitFor(() => {
      const patch = vi.mocked(global.fetch).mock.calls.find(
        (c) => String(c[0]).includes("/cms/editor") && String(c[1]?.method) === "PATCH",
      );
      expect(patch).toBeTruthy();
    });
  });

  it("cambiar el color de acento aplica la variable CSS al instante", async () => {
    mockFetch();
    renderDock();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /panel/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /panel/i }));
    await waitFor(() =>
      expect(screen.getByLabelText("Color acento")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("Color acento"), {
      target: { value: "#ff00ff" },
    });

    // La variable CSS del acento se actualiza en vivo (sin publicar aún)
    expect(
      document.documentElement.style.getPropertyValue("--brand-acento"),
    ).toBe("#ff00ff");
  });

  it("publicar llama al endpoint de publicación", async () => {
    mockFetch();
    renderDock();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /panel/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /panel/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /publicar cambios/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /publicar cambios/i }));
    await waitFor(() => {
      expect(
        vi.mocked(global.fetch).mock.calls.some((c) => String(c[0]).includes("/cms/publicar")),
      ).toBe(true);
    });
  });
});
