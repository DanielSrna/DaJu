import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "@/app-rutas";

function renderApp(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("Vitrina DaJu", () => {
  it("muestra los 5 botones del nav + el acceso de sesión separado arriba", () => {
    renderApp();

    expect(
      screen.getByRole("navigation", { name: "Principal" }),
    ).toBeInTheDocument();
    for (const nombre of [
      "Inicio",
      "Productos",
      "FAQ",
      "Servicios post-venta",
      "Contacto",
    ]) {
      expect(screen.getAllByRole("link", { name: nombre }).length).toBeGreaterThan(0);
    }

    // El acceso a la plataforma está en la TopBar (zona separada) y en el footer.
    expect(
      screen.getAllByRole("link", { name: /iniciar sesión/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("la página 404 propia funciona sin romper la app", () => {
    renderApp("/ruta-que-no-existe");
    expect(screen.getByText("Página no encontrada")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("el portal de cliente muestra 'zona en construcción'", () => {
    renderApp("/cliente/login");
    expect(screen.getByText("Zona en construcción")).toBeInTheDocument();
  });

  it("los errores de API muestran estado con reintento (sin pantalla blanca)", async () => {
    renderApp("/productos");
    expect(
      screen.getByRole("heading", { name: /Auditoría de código/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "¿No sabes qué elegir?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Comparativa: los tres paquetes lado a lado/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/no pudimos cargar los productos/i),
    ).toBeInTheDocument();
  });

  it("el inicio muestra '¿Por qué elegir DaJu?' ampliado y '¿Quiénes somos?'", () => {
    renderApp("/");

    expect(
      screen.getByRole("heading", { name: "¿Por qué elegir DaJu?" }),
    ).toBeInTheDocument();
    for (const nombre of [
      "Código a la medida",
      "Soporte con garantía",
      "Pensado para vender",
      "Proceso transparente",
      "Funcionalidades a tu medida",
      "Tecnología con estándares",
    ]) {
      expect(screen.getByRole("heading", { name: nombre })).toBeInTheDocument();
    }

    expect(
      screen.getByRole("heading", {
        name: /Un equipo de ingenieros de sistemas detrás de cada proyecto/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("¿Quiénes somos?")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "¿Cómo funciona?" }),
    ).toBeInTheDocument();
    for (const nombre of [
      "Elige tu paquete",
      "Completa el briefing",
      "Construimos con seguimiento",
      "Recibes soporte con garantía",
    ]) {
      expect(screen.getByRole("heading", { name: nombre })).toBeInTheDocument();
    }
    expect(
      screen.getByRole("link", { name: /Empezar mi proyecto/i }),
    ).toBeInTheDocument();
  });

  it("productos muestra las familias (paquetes, plantillas y consultoría) incluso si la API falla", async () => {
    renderApp("/productos");

    expect(
      screen.getByRole("heading", { name: "Plantillas listas para desplegar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Plantilla Reservas/ })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Consultoría por sesiones" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Auditoría de código/ })).toBeInTheDocument();
    expect(
      await screen.findByText(/no pudimos cargar los productos/i),
    ).toBeInTheDocument();
  });

  it("aplica meta tags (title y description) por ruta", () => {
    renderApp("/faq");
    expect(document.title).toContain("Preguntas frecuentes");
    const desc = document.querySelector('meta[name="description"]');
    expect(desc?.getAttribute("content")).toBeTruthy();
  });
});
