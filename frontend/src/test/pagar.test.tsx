import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppRoutes } from "@/app-rutas";

const PAGO = {
  id: "p1",
  tipoProducto: "paquete",
  tipoPago: "etapa",
  productoSlug: "operativo",
  descripcion: "Etapa: Inicio de desarrollo",
  monto: 400,
  moneda: "USD",
  montoCop: null,
  emailCliente: "ana@correo.com",
  estado: "pending",
  referencia: null,
  metodoPago: "",
  codigo: "DJ-ABC12",
  comprobante: null,
  referenciaCliente: "",
  proyectoId: "proy1",
  espacioId: "",
  etapaId: "et1",
  motivoRechazo: "",
  cantidad: 1,
  createdAt: new Date().toISOString(),
};

const NEQUI = {
  id: "m1",
  nombre: "Nequi",
  clave: "nequi",
  tipo: "manual",
  moneda: "COP",
  titular: "DaJu Plataform",
  datos: "300 000 0000",
  instrucciones: "Paga y escribe {codigo} en el mensaje.",
  qrUrl: "",
  activo: true,
  orden: 1,
};

const PAYPAL = {
  id: "m2",
  nombre: "PayPal",
  clave: "paypal",
  tipo: "paypal",
  moneda: "USD",
  titular: "",
  datos: "",
  instrucciones: "",
  qrUrl: "",
  activo: true,
  orden: 2,
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

describe("Página de pago del cliente", () => {
  it("muestra el código, elige Nequi y publica el monto en COP", async () => {
    const fn = mockFetchPorRuta({
      "/api/v1/auth/me": () => ({
        user: {
          id: "1",
          email: "ana@correo.com",
          nombre: "Ana",
          rol: "cliente",
          emailVerificado: true,
        },
      }),
      "/api/v1/pagos/p1": () => ({ pago: PAGO }),
      "/api/v1/metodos-pago": () => ({ metodos: [NEQUI, PAYPAL] }),
      "POST /api/v1/pagos/p1/metodo": () => ({
        pago: { ...PAGO, metodoPago: "nequi", montoCop: 1600000 },
        metodo: NEQUI,
        montoCop: 1600000,
        urlPago: null,
      }),
    });

    render(
      <MemoryRouter initialEntries={["/cliente/pagar/p1"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByText("DJ-ABC12")).toBeInTheDocument();

    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole("button", { name: /Nequi/i }));

    expect(await screen.findByText(/Datos para pagar con Nequi/i)).toBeInTheDocument();
    expect(screen.getAllByText(/1\.600\.000/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Paga y escribe DJ-ABC12 en el mensaje/i),
    ).toBeInTheDocument();

    const llamada = fn.mock.calls.find((c) =>
      String(c[0]).includes("/api/v1/pagos/p1/metodo"),
    );
    expect(llamada).toBeDefined();
    expect(JSON.parse(String(llamada![1]?.body))).toEqual({ metodo: "nequi" });
  });
});
