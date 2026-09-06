import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "@/app-rutas";
import { Blog } from "@/pages/vitrina/blog";
import { DetalleBlog } from "@/pages/vitrina/detalle-blog";

const publicaciones = [
  {
    id: "1",
    titulo: "¿Qué es una landing page y por qué la necesitas?",
    slug: "que-es-una-landing-page",
    tipo: "concepto",
    resumen: "La base de todo negocio que empieza.",
    contenido:
      "¿Qué es?\n\nUna landing page es una página enfocada en una sola acción.\n\n¿Por qué importa?\n\nPorque convierte visitantes en clientes.",
    secciones: ["faq"],
  },
  {
    id: "2",
    titulo: "Ahora aceptamos pagos con MercadoPago",
    slug: "pagos-con-mercadopago",
    tipo: "noticia",
    resumen: "Nueva funcionalidad disponible.",
    contenido: "A partir de ahora aceptamos MercadoPago.",
    secciones: [],
  },
  {
    id: "3",
    titulo: "¿Qué es la garantía y el soporte post-venta en una web?",
    slug: "garantia-y-soporte-postventa",
    tipo: "concepto",
    resumen: "Lo que pasa después de la entrega define si tu inversión rinde.",
    contenido:
      "¿Qué es?\n\nLa garantía es la ventana de soporte tras la entrega.\n\n¿Por qué importa?\n\nPorque tener a quien llamar marca la diferencia.",
    secciones: ["faq", "postventa"],
  },
];

function responderApi(ruta: string): Response {
  const url = new URL(ruta, "http://test.local");
  const pathname = url.pathname; // ej. /api/v1/publicaciones
  const seccion = url.searchParams.get("seccion");

  let cuerpo: unknown = {};

  if (pathname === "/api/v1/cms") {
    cuerpo = {
      logo: null,
      colores: { primario: "#0F1B2D", secundario: "#F8FAFC", acento: "#F59E0B" },
      marquesina: { texto: "", activo: false },
      carrusel: [],
    };
  } else if (pathname.endsWith("/publicaciones/que-es-una-landing-page")) {
    cuerpo = { publicacion: publicaciones[0] };
  } else if (pathname === "/api/v1/publicaciones") {
    cuerpo =
      seccion === "faq" || seccion === "postventa"
        ? {
            publicaciones: publicaciones.filter((p) =>
              p.secciones.includes(seccion as "faq" | "postventa"),
            ),
            total: 1,
          }
        : { publicaciones, total: publicaciones.length };
  } else {
    throw new Error(`Ruta no esperada en test: ${ruta}`);
  }

  return new Response(JSON.stringify(cuerpo), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((ruta: RequestInfo | URL) => Promise.resolve(responderApi(String(ruta)))),
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  mockFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Blog", () => {
  it("la lista muestra tarjetas de conceptos y noticias", async () => {
    render(
      <MemoryRouter>
        <Blog />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("¿Qué es una landing page y por qué la necesitas?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ahora aceptamos pagos con MercadoPago"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Concepto").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Noticia").length).toBeGreaterThan(0);
  });

  it("el detalle convierte subtítulos en títulos y muestra el CTA", async () => {
    render(
      <MemoryRouter initialEntries={["/blog/que-es-una-landing-page"]}>
        <Routes>
          <Route path="/blog/:slug" element={<DetalleBlog />} />
        </Routes>
      </MemoryRouter>,
    );

    const titulo = await screen.findByRole("heading", {
      name: "¿Qué es una landing page y por qué la necesitas?",
    });
    expect(titulo).toBeInTheDocument();

    // Subtítulo detectado por la heurística (termina en "?")
    expect(screen.getByRole("heading", { name: "¿Qué es?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "¿Por qué importa?" })).toBeInTheDocument();

    expect(screen.getByText(/¿quieres esto para tu negocio/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contáctanos" })).toBeInTheDocument();
  });

  it("la ruta /blog está en el nav y funciona en la app", async () => {
    render(
      <MemoryRouter initialEntries={["/blog"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Blog", { selector: "h1" })).toBeInTheDocument();
    expect(screen.getByText("¿Qué es una landing page y por qué la necesitas?")).toBeInTheDocument();
  });
});

describe("Enlaces en línea hacia el blog", () => {
  it("el FAQ enlaza 'Conoce más' a la publicación asociada", async () => {
    render(
      <MemoryRouter initialEntries={["/faq"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    // Abrir la pregunta para que su contenido (y el enlace) exista en el DOM.
    fireEvent.click(screen.getByRole("button", { name: /¿qué garantías hay\?/i }));

    const enlace = await screen.findByRole("link", {
      name: /conoce más acerca de esto/i,
    });
    expect(enlace).toHaveAttribute("href", "/blog/garantia-y-soporte-postventa");
  });

  it("no muestra enlaces si no hay publicaciones asociadas", async () => {
    // Sin posts para faq: el FAQ no debe tener enlaces al blog
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ publicaciones: [], total: 0 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
    );

    render(
      <MemoryRouter initialEntries={["/faq"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await screen.findByText("Preguntas frecuentes");
    expect(
      screen.queryByRole("link", { name: /conoce más acerca de esto/i }),
    ).not.toBeInTheDocument();
  });
});
