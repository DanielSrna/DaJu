import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Marquesina } from "@/components/layout/navegacion";
import type { CmsPublico } from "@/lib/api/tipos";

const cmsBase: CmsPublico = {
  logo: null,
  colores: { primario: "#0F1B2D", secundario: "#F8FAFC", acento: "#F59E0B" },
  marquesina: { texto: "¡Oferta de prueba!", activo: true },
  carrusel: [],
  textos: {},
  descuento: { activo: false, porcentaje: 20, mensaje: "", hasta: null },
  diasExtra: 0,
};

vi.mock("@/lib/tema", () => ({
  useTema: () => ({ cms: cmsMock, cargando: false, recargar: async () => {} }),
}));

// cmsMock se reasigna por test (vi.hoisted no necesario en vitest con var global)
let cmsMock: CmsPublico = cmsBase;
beforeEach(() => {
  cmsMock = { ...cmsBase, marquesina: { texto: "¡Oferta de prueba!", activo: true } };
});

describe("Marquesina (franja animada del CMS)", () => {
  it("se oculta si el CMS la desactiva", () => {
    cmsMock = { ...cmsBase, marquesina: { texto: "¡Oferta!", activo: false } };
    render(<Marquesina />);
    expect(screen.queryByText(/oferta/i)).not.toBeInTheDocument();
  });

  it("se oculta si el texto está vacío", () => {
    cmsMock = { ...cmsBase, marquesina: { texto: "   ", activo: true } };
    render(<Marquesina />);
    expect(screen.queryByText(/oferta/i)).not.toBeInTheDocument();
  });

  it("repite el texto varias veces y duplica el ciclo para el loop infinito", () => {
    render(<Marquesina />);
    const contenedor = screen.getByLabelText(/anuncio: ¡oferta de prueba!/i);
    expect(contenedor).toBeInTheDocument();

    const copiaOculta = contenedor.querySelector('[aria-hidden="true"]');
    expect(copiaOculta).not.toBeNull();
    expect(copiaOculta!.textContent).toContain("¡Oferta de prueba!");
    expect(copiaOculta!.textContent).toContain("·");
  });
});
