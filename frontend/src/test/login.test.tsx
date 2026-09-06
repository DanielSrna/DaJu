import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "@/app-rutas";

beforeEach(() => vi.restoreAllMocks());

describe("Pantalla de inicio de sesión", () => {
  it("muestra el formulario de login y pide email + contraseña", () => {
    global.fetch = vi.fn(() => Promise.resolve(new Response("{}", { status: 401 }))) as unknown as typeof fetch;
    render(
      <MemoryRouter initialEntries={["/cliente/login"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ingresar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ingresar/i })).toBeInTheDocument();
  });

  it("al enviar credenciales hace POST a /auth/login", async () => {
    const fetchMock = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("/auth/login")) {
        return Promise.resolve(
          new Response(JSON.stringify({ user: { id: "1", email: "admin@x.com", nombre: "Admin", rol: "admin" } }), { status: 200 }),
        );
      }
      // Respuestas para el resto de la app (CMS, auth/me, publicaciones...)
      return Promise.resolve(
        new Response(
          JSON.stringify(
            u.includes("/cms")
              ? {
                  logo: null,
                  colores: { primario: "#0F1B2D", secundario: "#F8FAFC", acento: "#F59E0B" },
                  marquesina: { texto: "", activo: false },
                  carrusel: [],
                  textos: {},
                  descuento: { activo: false, porcentaje: 20, mensaje: "", hasta: null },
                  diasExtra: 0,
                }
              : { user: null, publicaciones: [], total: 0, paquetes: [], funcionalidades: [], contacto: {} },
          ),
          { status: 200 },
        ),
      );
    }) as unknown as typeof fetch;
    global.fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/cliente/login"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByRole("button", { name: /ingresar/i }));
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: "admin@x.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Admin123" } });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((c) => String(c[0]).includes("/auth/login"));
      expect(call).toBeTruthy();
      const body = JSON.parse(String((call as unknown[])[1]?.body));
      expect(body).toEqual({ email: "admin@x.com", password: "Admin123" });
    });
  });

  it("muestra error si las credenciales son inválidas (401)", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Credenciales inválidas" } }),
          { status: 401 },
        ),
      ),
    ) as unknown as typeof fetch;

    render(
      <MemoryRouter initialEntries={["/cliente/login"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByRole("button", { name: /ingresar/i }));
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: "bad@x.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByText(/credenciales inválidas/i)).toBeInTheDocument();
  });

  it("admin tras login es redirigido al inicio con modo edición", async () => {
    global.fetch = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("/auth/login")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ user: { id: "1", email: "monokronia@gmail.com", nombre: "Admin", rol: "admin" } }),
            { status: 200 },
          ),
        );
      }
      if (u.includes("/auth/me") || u.includes("/cms") || u.includes("/publicaciones") || u.includes("/paquetes")) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              u.includes("/auth/me")
                ? { user: { id: "1", email: "monokronia@gmail.com", nombre: "Admin", rol: "admin" } }
                : u.includes("/cms")
                  ? {
                      logo: null,
                      colores: { primario: "#0F1B2D", secundario: "#F8FAFC", acento: "#F59E0B" },
                      marquesina: { texto: "", activo: false },
                      carrusel: [],
                      textos: {},
                      descuento: { activo: false, porcentaje: 20, mensaje: "", hasta: null },
                      diasExtra: 0,
                    }
                  : { publicaciones: [], total: 0, paquetes: [], funcionalidades: [], contacto: {} },
            ),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    }) as unknown as typeof fetch;

    render(
      <MemoryRouter initialEntries={["/cliente/login"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByRole("button", { name: /ingresar/i }));
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: "monokronia@gmail.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Admin123!" } });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    // Tras el login: redirigió al inicio y se ve la barra de admin
    await waitFor(() => {
      expect(
        screen.getByText(/bienvenido administrador/i),
      ).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByRole("link", { name: /edición/i })).toBeInTheDocument();
  });
});
