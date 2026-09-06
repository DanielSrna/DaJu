import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "@/app-rutas";
import { CarruselVertical } from "@/components/vitrina/carrusel-vertical";
import { TemaProvider } from "@/lib/tema";

describe("Hero (carrusel por pasos)", () => {
  it("muestra las tarjetas por defecto cuando el CMS no tiene carrusel", async () => {
    render(
      <MemoryRouter>
        <TemaProvider>
          <CarruselVertical />
        </TemaProvider>
      </MemoryRouter>,
    );

    // Sin API, el tema usa la paleta por defecto sin carrusel → tarjetas por defecto.
    const tarjetas = await screen.findAllByText("Lanza tu web en 10 días");
    expect(tarjetas.length).toBeGreaterThan(0);
  });

  it("la carta activa lleva el énfasis dorado (data-enfasis + clase oro)", () => {
    const { container } = render(
      <MemoryRouter>
        <TemaProvider>
          <CarruselVertical />
        </TemaProvider>
      </MemoryRouter>,
    );

    const activa = container.querySelector('[data-enfasis="true"]');
    expect(activa).not.toBeNull();
    expect(activa!.className).toContain("carta-oro");
    expect(activa!.className).not.toContain("carta-base");
  });

  it("el hero se estira hasta el borde inferior del viewport (sin barra blanca)", async () => {
    const { container } = render(
      <MemoryRouter>
        <AppRoutes />
      </MemoryRouter>,
    );

    const hero = container.querySelector("section.bg-\\[var\\(--brand-primario\\)\\]");
    expect(hero).not.toBeNull();

    // El efecto de medición llena el alto disponible en px (jsdom: 768).
    const minHeight = (hero as HTMLElement).style.minHeight;
    expect(minHeight).toMatch(/^\d+px$/);
  });
});
