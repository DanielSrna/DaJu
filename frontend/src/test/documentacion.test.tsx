import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SeccionDocumentacion } from "@/components/portal/seccion-documentacion";

const DOCUMENTO = {
  id: "d1",
  titulo: "Manual del administrador",
  descripcion: "Cómo gestionar proyectos",
  archivo: {
    url: "https://archivos.test/manual.pdf",
    nombre: "manual-admin.pdf",
    tamañoBytes: 2048,
  },
  createdAt: new Date().toISOString(),
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

describe("Documentación del entorno", () => {
  it("muestra el vacío y permite al admin subir un PDF con título", async () => {
    const fn = mockFetchPorRuta({
      "/api/v1/proyectos/p1/documentos": () => ({ documentos: [] }),
      "POST /api/v1/proyectos/p1/documentos": () => ({ documento: DOCUMENTO }),
    });

    render(
      <SeccionDocumentacion familia="proyecto" id="p1" esAdmin />,
    );

    expect(
      await screen.findByText(/Aún no hay manuales disponibles/i),
    ).toBeInTheDocument();

    const usuario = userEvent.setup();
    await usuario.type(
      screen.getByLabelText("Título del manual"),
      "Manual del administrador",
    );
    await usuario.upload(
      screen.getByLabelText("Archivo PDF del manual"),
      new File(["%PDF-1.4"], "manual.pdf", { type: "application/pdf" }),
    );
    await usuario.click(screen.getByRole("button", { name: /Subir manual/i }));

    const llamada = fn.mock.calls.find(
      (c) =>
        String(c[0]).includes("/api/v1/proyectos/p1/documentos") &&
        c[1]?.method === "POST",
    );
    expect(llamada).toBeDefined();
    const cuerpo = llamada![1]?.body as FormData;
    expect(cuerpo).toBeInstanceOf(FormData);
    expect(cuerpo.get("titulo")).toBe("Manual del administrador");
    expect((cuerpo.get("archivo") as File).name).toBe("manual.pdf");
  });

  it("el cliente ve los manuales con su enlace de descarga", async () => {
    mockFetchPorRuta({
      "/api/v1/proyectos/p1/documentos": () => ({
        documentos: [DOCUMENTO],
      }),
    });

    render(
      <SeccionDocumentacion familia="proyecto" id="p1" esAdmin={false} />,
    );

    expect(
      await screen.findByText("Manual del administrador"),
    ).toBeInTheDocument();
    expect(screen.getByText("Cómo gestionar proyectos")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Descargar/i }),
    ).toHaveAttribute("href", DOCUMENTO.archivo.url);
    // El cliente no tiene el formulario de subida.
    expect(
      screen.queryByRole("button", { name: /Subir manual/i }),
    ).not.toBeInTheDocument();
  });
});
