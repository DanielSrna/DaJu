import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Navbar } from "@/components/layout/navegacion";

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

describe("Navbar móvil (hamburguesa)", () => {
  it("el botón hamburguesa inicia cerrado (aria-expanded=false)", () => {
    renderNavbar();
    const toggle = screen.getByRole("button", { name: /abrir menú/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("al pulsarlo abre el panel con los enlaces y el CTA", () => {
    renderNavbar();
    const toggle = screen.getByRole("button", { name: /abrir menú/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const panel = screen.getByRole("navigation", { name: /principal móvil/i });
    expect(panel).toBeInTheDocument();
    for (const nombre of ["Inicio", "Productos", "Blog", "FAQ", "Servicios post-venta", "Contacto"]) {
      expect(within(panel).getByRole("link", { name: nombre })).toBeInTheDocument();
    }
    expect(within(panel).getByRole("link", { name: /cotizar proyecto/i })).toBeInTheDocument();
  });

  it("se cierra al pulsar de nuevo y con la tecla Escape", () => {
    renderNavbar();
    const toggle = screen.getByRole("button", { name: /abrir menú/i });

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
