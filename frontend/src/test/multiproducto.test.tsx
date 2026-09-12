import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppRoutes } from "@/app-rutas";

function mockFetchPorRuta(rutas: Record<string, () => unknown>) {
  const fn = vi.fn((url: string | URL | Request) => {
    const ruta = String(url).replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    const handler = rutas[ruta];
    if (!handler) return Promise.reject(new Error(`Sin mock para ${ruta}`));
    return Promise.resolve(new Response(JSON.stringify(handler()), { status: 200 }));
  });
  vi.stubGlobal("fetch", fn as unknown as typeof fetch);
  return fn;
}

const PLANTILLA = {
  id: "p1",
  nombre: "Plantilla Reservas",
  slug: "reservas",
  plataforma: "Reservas",
  descripcion: "<p>Sistema de reservas listo.</p>",
  precio: 299,
  moneda: "USD",
  vistasIncluidas: 5,
  soporteMeses: 3,
  diasEntrega: 20,
  features: ["Calendario", "Recordatorios"],
  imagen: null,
  galeria: [],
  detalles: [],
  activo: true,
};

const SERVICIO = {
  id: "s1",
  nombre: "Auditoría de código",
  slug: "auditoria-codigo",
  categoria: "auditoria",
  descripcion: "<p>Revisión profunda de tu código.</p>",
  precio: 120,
  moneda: "USD",
  duracionMin: 60,
  canal: "Meet",
  incluye: ["Informe priorizado"],
  detalles: [],
  activo: true,
};

function renderApp(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

const CMS_POR_DEFECTO = {
  logo: null,
  colores: { primario: "#0f1b2d", secundario: "#f8fafc", acento: "#f59e0b" },
  marquesina: { texto: "", activo: false },
  carrusel: [],
  textos: {},
  descuento: { activo: false, porcentaje: 20, mensaje: "", hasta: null },
  diasExtra: 0,
};

describe("Detalles multiproducto", () => {
  it("el detalle de plantilla muestra su contenido y el CTA de compra", async () => {
    mockFetchPorRuta({
      "/api/v1/cms": () => CMS_POR_DEFECTO,
      "/api/v1/plantillas/reservas": () => ({ plantilla: PLANTILLA }),
    });

    renderApp("/plantillas/reservas");
    expect(await screen.findByRole("heading", { name: "Plantilla Reservas" }))
      .toBeInTheDocument();
    expect(screen.getByText("Plantilla · Reservas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cotizar esta plantilla/i }),
    ).toBeInTheDocument();
  });

  it("el detalle de servicio es textual y reserva por sesión", async () => {
    mockFetchPorRuta({
      "/api/v1/servicios/auditoria-codigo": () => ({ servicio: SERVICIO }),
    });

    renderApp("/servicios/auditoria-codigo");
    expect(
      await screen.findByRole("heading", { name: "Auditoría de código" }),
    ).toBeInTheDocument();
    expect(screen.getByText("60 min")).toBeInTheDocument();
    expect(screen.getByText("Por Meet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cotizar mis sesiones/i }),
    ).toBeInTheDocument();
  });

  it("mercado de plantillas y servicios en /productos enlaza a los detalles", async () => {
    mockFetchPorRuta({
      "/api/v1/paquetes": () => ({ paquetes: [] }),
      "/api/v1/plantillas": () => ({ plantillas: [PLANTILLA] }),
      "/api/v1/servicios": () => ({ servicios: [SERVICIO] }),
    });

    const { container } = renderApp("/productos");
    await waitFor(() =>
      expect(container.querySelectorAll("a[href='/plantillas/reservas']").length)
        .toBeGreaterThan(0),
    );
    expect(
      container.querySelectorAll("a[href='/servicios/auditoria-codigo']").length,
    ).toBeGreaterThan(0);
  });

  it("la compra de servicio envía tipoProducto, productoId y cantidad", async () => {
    const fn = mockFetchPorRuta({
      "/api/v1/servicios/auditoria-codigo": () => ({ servicio: SERVICIO }),
      "/api/v1/checkout": () => ({
        urlPago: "https://pasarela.test/pagar",
        pago: { id: "x", tipoProducto: "servicio", productoSlug: "auditoria-codigo", cantidad: 3, monto: 360, moneda: "USD", estado: "pending" },
      }),
    });

    renderApp("/servicios/auditoria-codigo/comprar");
    const usuario = userEvent.setup();

    await usuario.type(await screen.findByLabelText("Nombre"), "Juan Pérez");
    await usuario.type(screen.getByLabelText("Email"), "cliente@correo.com");
    await usuario.type(screen.getByLabelText("Contraseña"), "Clave123");

    await usuario.click(screen.getByRole("button", { name: "Más sesiones" }));
    await usuario.click(screen.getByRole("button", { name: "Más sesiones" }));
    expect(screen.getByText("3")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /Pagar 3 sesión/i }));

    const llamada = fn.mock.calls.find((c) =>
      String(c[0]).includes("/api/v1/checkout"),
    );
    expect(llamada).toBeDefined();
    const cuerpo = JSON.parse(String(llamada![1]?.body));
    expect(cuerpo).toMatchObject({
      tipoProducto: "servicio",
      productoId: "s1",
      cantidad: 3,
    });
  });
});
