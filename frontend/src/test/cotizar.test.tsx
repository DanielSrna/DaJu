import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppRoutes } from "@/app-rutas";

const PAQUETE = {
  id: "pq1",
  nombre: "Paquete Validor",
  slug: "validor",
  tipo: "validor",
  descripcion: "<p>Landing de una vista.</p>",
  garantia: "",
  precio: 199,
  moneda: "USD",
  vistasIncluidas: 1,
  soporteMeses: 2,
  diasEntrega: 15,
  features: ["Landing"],
  imagen: null,
  galeria: [],
  detalles: [],
  activo: true,
};

const CMS_POR_DEFECTO = {
  logo: null,
  colores: { primario: "#0f1b2d", secundario: "#f8fafc", acento: "#f59e0b" },
  marquesina: { texto: "", activo: false },
  carrusel: [],
  textos: {},
  descuento: { activo: false, porcentaje: 20, mensaje: "", hasta: null },
  diasExtra: 0,
};

function mockFetchPorRuta(rutas: Record<string, () => unknown>) {
  const fn = vi.fn((url: string | URL | Request) => {
    const ruta = String(url).replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    const handler = rutas[ruta];
    if (!handler) return Promise.reject(new Error(`Sin mock para ${ruta}`));
    return Promise.resolve(
      new Response(JSON.stringify(handler()), { status: 200 }),
    );
  });
  vi.stubGlobal("fetch", fn as unknown as typeof fetch);
  return fn;
}

function renderApp(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("Cotización desde la vitrina", () => {
  it("registra al cliente y muestra la confirmación de correo", async () => {
    const fn = mockFetchPorRuta({
      "/api/v1/cms": () => CMS_POR_DEFECTO,
      "/api/v1/paquetes/validor": () => ({ paquete: PAQUETE }),
      "/api/v1/cotizaciones": () => ({
        entorno: {
          tipo: "proyecto",
          id: "proy1",
          tipoProducto: "paquete",
          productoSlug: "validor",
          productoNombre: "Paquete Validor",
          estado: "planeacion",
        },
        usuario: {
          id: "u1",
          email: "ana@correo.com",
          nombre: "Ana",
          rol: "cliente",
          emailVerificado: false,
        },
        nuevo: true,
      }),
    });

    renderApp("/productos/validor");
    const usuario = userEvent.setup();

    const botones = await screen.findAllByRole("button", {
      name: /Cotizar este paquete/i,
    });
    await usuario.click(botones[0]);

    await usuario.type(screen.getByLabelText("Nombre"), "Ana");
    await usuario.type(screen.getByLabelText("Primer apellido"), "Pérez");
    await usuario.type(
      screen.getByLabelText("Fecha de nacimiento"),
      "1995-04-12",
    );
    await usuario.type(screen.getByLabelText("Email"), "ana@correo.com");
    await usuario.type(
      screen.getByLabelText("Escribe de nuevo tu email"),
      "ana@correo.com",
    );
    await usuario.type(screen.getByLabelText("Contraseña"), "Clave123");
    await usuario.type(
      screen.getByLabelText("Escribe de nuevo tu contraseña"),
      "Clave123",
    );
    await usuario.click(
      screen.getByLabelText(/contrato de condiciones del servicio/i),
    );
    await usuario.click(
      screen.getByLabelText(/contrato de manejo de datos personales/i),
    );
    await usuario.click(
      screen.getByRole("button", { name: /Cotizar y crear mi cuenta/i }),
    );

    expect(await screen.findByText(/Revisa tu correo/i)).toBeInTheDocument();
    expect(screen.getByText("ana@correo.com")).toBeInTheDocument();

    const llamada = fn.mock.calls.find((c) =>
      String(c[0]).includes("/api/v1/cotizaciones"),
    );
    expect(llamada).toBeDefined();
    const cuerpo = JSON.parse(String(llamada![1]?.body));
    expect(cuerpo).toMatchObject({
      tipoProducto: "paquete",
      paqueteId: "pq1",
      email: "ana@correo.com",
      primerApellido: "Pérez",
      fechaNacimiento: "1995-04-12",
      aceptaCondiciones: true,
      aceptaDatos: true,
    });
  });

  it("un cliente con sesión agrega el producto sin registrarse de nuevo", async () => {
    mockFetchPorRuta({
      "/api/v1/cms": () => CMS_POR_DEFECTO,
      "/api/v1/auth/me": () => ({
        user: {
          id: "u1",
          email: "ana@correo.com",
          nombre: "Ana Pérez",
          rol: "cliente",
          emailVerificado: true,
        },
      }),
      "/api/v1/paquetes/validor": () => ({ paquete: PAQUETE }),
      "/api/v1/cotizaciones/cliente": () => ({
        entorno: {
          tipo: "proyecto",
          id: "proy2",
          tipoProducto: "paquete",
          productoSlug: "validor",
          productoNombre: "Paquete Validor",
          estado: "planeacion",
        },
        usuario: {
          id: "u1",
          email: "ana@correo.com",
          nombre: "Ana Pérez",
          rol: "cliente",
          emailVerificado: true,
        },
        nuevo: false,
      }),
    });

    renderApp("/productos/validor");
    const usuario = userEvent.setup();

    const botones = await screen.findAllByRole("button", {
      name: /Cotizar este paquete/i,
    });
    await usuario.click(botones[0]);

    expect(
      await screen.findByText(/Ya tienes sesión como/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Agregar a mis proyectos/i }),
    ).toBeInTheDocument();
    // No se piden datos de registro ni contratos.
    expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/contrato de condiciones del servicio/i),
    ).not.toBeInTheDocument();
  });
});
