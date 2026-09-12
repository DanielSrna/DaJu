import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResumenProyecto } from "@/components/portal/resumen-proyecto";

const INFORME = {
  entorno: {
    tipo: "proyecto",
    id: "p1",
    nombre: "Paquete Validor",
    estado: "recibido",
    moneda: "USD",
    cliente: "Ana",
  },
  vistas: 2,
  funciones: 1,
  precioBase: 180,
  costoTotal: 600,
  montoPagado: 400,
  impacto: { porcentaje: 35, descripcion: "Menos tareas manuales" },
  rendimiento: { total: 3, promedio: 90 },
  seguridad: { total: 2, promedio: null },
  tests: { total: 1, aprobados: 1 },
  pruebas: [
    {
      id: "pr1",
      tipo: "rendimiento",
      titulo: "Prueba de carga",
      descripcion: "",
      calificacion: 90,
      exitoso: null,
      createdAt: new Date().toISOString(),
    },
  ],
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

describe("Resumen del proyecto", () => {
  it("muestra composición, costos, impacto y pruebas; el detalle va en el PDF", async () => {
    mockFetchPorRuta({
      "/api/v1/proyectos/p1/informe": () => ({ informe: INFORME }),
    });

    render(<ResumenProyecto familia="proyecto" id="p1" esAdmin={false} />);

    expect(await screen.findByText("Resumen del proyecto")).toBeInTheDocument();
    expect(screen.getByText("2 vistas · 1 funciones")).toBeInTheDocument();
    expect(
      screen.getByText("Producto $180 · plan $600 · pagado $400 USD"),
    ).toBeInTheDocument();
    expect(screen.getByText("35%")).toBeInTheDocument();
    expect(screen.getByText("3 pruebas · 90%")).toBeInTheDocument();
    expect(screen.getByText("2 pruebas · Pendiente")).toBeInTheDocument();
    expect(screen.getByText("1 aprobados de 1")).toBeInTheDocument();
    // El cliente no ve los títulos de las pruebas en pantalla.
    expect(screen.queryByText("Prueba de carga")).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /Descargar informe \(PDF\)/i }),
    ).toBeInTheDocument();
  });

  it("el admin agrega una prueba de seguridad con calificación", async () => {
    const fn = mockFetchPorRuta({
      "/api/v1/proyectos/p1/informe": () => ({ informe: INFORME }),
      "POST /api/v1/proyectos/p1/informe/pruebas": () => ({ pruebas: [] }),
    });

    render(<ResumenProyecto familia="proyecto" id="p1" esAdmin />);
    expect(
      await screen.findByText(/Editar informe técnico \(admin\)/i),
    ).toBeInTheDocument();

    const usuario = userEvent.setup();
    await usuario.selectOptions(
      screen.getByLabelText("Tipo de prueba"),
      "seguridad",
    );
    await usuario.type(
      screen.getByLabelText("Título de la nueva prueba"),
      "Escaneo de dependencias",
    );
    await usuario.type(
      screen.getByLabelText("Calificación de la nueva prueba"),
      "85",
    );
    await usuario.click(screen.getByRole("button", { name: /^Agregar$/i }));

    const llamada = fn.mock.calls.find((c) =>
      String(c[0]).includes("/api/v1/proyectos/p1/informe/pruebas"),
    );
    expect(llamada).toBeDefined();
    expect(JSON.parse(String(llamada![1]?.body))).toMatchObject({
      tipo: "seguridad",
      titulo: "Escaneo de dependencias",
      calificacion: 85,
    });
  });
});
