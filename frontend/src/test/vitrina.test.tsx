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

  it("el acceso de cliente muestra el formulario de inicio de sesión", () => {
    renderApp("/cliente/login");
    expect(screen.getByRole("heading", { name: "Inicia sesión" })).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
  });

  it("las demás rutas del portal de cliente siguen en construcción", () => {
    renderApp("/cliente/proyectos");
    expect(screen.getByText("Zona en construcción")).toBeInTheDocument();
  });

  it("los errores de API muestran estado con reintento (sin pantalla blanca)", async () => {
    renderApp("/productos");
    // Con la API caída no hay ofertas estáticas: la sección de ayuda se oculta.
    expect(
      screen.queryByRole("heading", { name: "¿No sabes qué elegir?" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText(/no pudimos cargar los productos/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reintentar" }),
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

  it("productos muestra los títulos de las familias aunque la API falle", async () => {
    renderApp("/productos");

    // Los títulos de sección son estáticos; las tarjetas de plantillas/servicios
    // vienen de la API (ya no hay contenido estático).
    expect(
      screen.getByRole("heading", { name: "Plantillas listas para desplegar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Consultoría por sesiones" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/no pudimos cargar los productos/i),
    ).toBeInTheDocument();
  });

  it("la sección de resultados no muestra 'Conoce más aquí →' sin publicaciones cargadas", () => {
    renderApp("/");
    // Con fetch sin respuesta, el mapa de publicaciones queda vacío → sin enlaces.
    expect(screen.queryByRole("link", { name: /conoce más aquí →/i })).not.toBeInTheDocument();
  });

  it("aplica meta tags (title y description) por ruta", () => {
    renderApp("/faq");
    expect(document.title).toContain("Preguntas frecuentes");
    const desc = document.querySelector('meta[name="description"]');
    expect(desc?.getAttribute("content")).toBeTruthy();
  });
});
