import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Footer } from "@/components/layout/footer";

describe("Footer", () => {
  it("muestra los chips de calidad y certificaciones", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/ISO\/IEC 25000/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ISO 9001/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Quality and Software Testing/i)).toBeInTheDocument();
    expect(screen.getByText(/MongoDB Certified Developer Associate/i)).toBeInTheDocument();
    expect(screen.getByText(/Pagos seguros con pasarela/i)).toBeInTheDocument();
  });

  it("enlaza las páginas legales (términos y privacidad)", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /términos y condiciones/i })).toHaveAttribute("href", "/terminos");
    expect(screen.getByRole("link", { name: /política de privacidad/i })).toHaveAttribute("href", "/privacidad");
  });

  it("tiene botón volver arriba y logos de redes como botones", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /volver arriba/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WhatsApp" })).toBeInTheDocument();
  });
});
