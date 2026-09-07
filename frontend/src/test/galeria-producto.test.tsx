import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GaleriaProducto } from "@/components/vitrina/galeria-producto";

const VISTAS = [
  { url: "https://ejemplo.com/1.png", publicId: "p1" },
  { url: "https://ejemplo.com/2.png", publicId: "p2" },
  { url: "https://ejemplo.com/3.png", publicId: "p3" },
];

const VISTAS4 = [
  { url: "https://ejemplo.com/1.png", publicId: "p1" },
  { url: "https://ejemplo.com/2.png", publicId: "p2" },
  { url: "https://ejemplo.com/3.png", publicId: "p3" },
  { url: "https://ejemplo.com/4.png", publicId: "p4" },
];

function renderizar(vistas = VISTAS) {
  return render(<GaleriaProducto vistas={vistas} nombre="Validor" />);
}

function marco(): HTMLElement {
  return screen.getByRole("button", { name: "Ampliar imagen" }).closest(".group")!;
}

function imagenPrincipal(): HTMLImageElement {
  return screen.getByRole("img", { name: /Vista 1 de Validor|Vista 2 de Validor|Vista 3 de Validor/ });
}

describe("Galería del detalle de producto", () => {
  it("muestra la primera imagen y el contador 1 / 3", () => {
    renderizar();
    expect(imagenPrincipal()).toHaveAttribute("src", "https://ejemplo.com/1.png");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Ver imagen [123]$/ })).toHaveLength(3);
  });

  it("la flecha siguiente avanza la imagen y la anterior retrocede", () => {
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Imagen siguiente" }));
    expect(imagenPrincipal()).toHaveAttribute("src", "https://ejemplo.com/2.png");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Imagen anterior" }));
    expect(imagenPrincipal()).toHaveAttribute("src", "https://ejemplo.com/1.png");
  });

  it("al final de la galería la siguiente vuelve a la primera (ciclo)", () => {
    renderizar();
    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Imagen siguiente" }));
    }
    expect(imagenPrincipal()).toHaveAttribute("src", "https://ejemplo.com/1.png");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("clic en una miniatura muestra esa imagen", () => {
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Ver imagen 3" }));
    expect(imagenPrincipal()).toHaveAttribute("src", "https://ejemplo.com/3.png");
  });

  it("clic en el marco abre el zoom a pantalla completa con la misma imagen", () => {
    renderizar();
    fireEvent.click(imagenPrincipal());
    const dialogo = screen.getByRole("dialog", { name: "Imagen ampliada de Validor" });
    expect(dialogo).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Vista 1 de Validor (ampliada)" })).toHaveAttribute(
      "src",
      "https://ejemplo.com/1.png",
    );
  });

  it("con el zoom abierto, las flechas cambian la vista y Escape cierra", () => {
    renderizar();
    fireEvent.click(imagenPrincipal());
    const dialogo = screen.getByRole("dialog", { name: "Imagen ampliada de Validor" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Imagen siguiente" }));
    expect(within(dialogo).getByRole("img", { name: "Vista 2 de Validor (ampliada)" })).toHaveAttribute(
      "src",
      "https://ejemplo.com/2.png",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("el botón cerrar del zoom cierra y mantiene la posición", () => {
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Ver imagen 2" }));
    const actual = imagenPrincipal();
    fireEvent.click(actual);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar vista ampliada" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Vista 2 de Validor" })).toHaveAttribute(
      "src",
      "https://ejemplo.com/2.png",
    );
  });
});

describe("Rotación automática de la galería", () => {
  afterEach(() => vi.useRealTimers());

  it("avanza sola lentamente mientras no se toca", () => {
    vi.useFakeTimers();
    renderizar(VISTAS4);
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText("3 / 4")).toBeInTheDocument();
  });

  it("poner el mouse encima cancela la rotación para siempre", () => {
    vi.useFakeTimers();
    renderizar(VISTAS4);
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByText("2 / 4")).toBeInTheDocument();

    const m = marco();
    fireEvent.mouseEnter(m);
    act(() => vi.advanceTimersByTime(50_000));
    expect(screen.getByText("2 / 4")).toBeInTheDocument();

    // Salir el mouse NO reinicia la rotación
    fireEvent.mouseLeave(m);
    act(() => vi.advanceTimersByTime(50_000));
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("un toque sobre el marco (móvil) también cancela la rotación", () => {
    vi.useFakeTimers();
    renderizar(VISTAS4);
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByText("2 / 4")).toBeInTheDocument();

    act(() => fireEvent.pointerDown(marco()));
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("interactuar con las miniaturas cancela la rotación", () => {
    vi.useFakeTimers();
    renderizar(VISTAS4);
    act(() => vi.advanceTimersByTime(5_000));
    fireEvent.click(screen.getByRole("button", { name: "Ver imagen 1" }));
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
  });

  it("no rota si el usuario prefiere movimiento reducido", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    renderizar(VISTAS4);
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
  });
});

describe("Ocultamiento de controles hasta hover", () => {
  it("finos (mouse): ocultos hasta que el mouse esté encima; táctiles: visibles", () => {
    renderizar();
    const m = marco();
    expect(m.className).toContain("group");

    for (const nombre of ["Imagen anterior", "Imagen siguiente"]) {
      const boton = screen.getByRole("button", { name: nombre });
      expect(boton.className).toContain("pointer-fine:opacity-0");
      expect(boton.className).toContain("pointer-fine:group-hover:opacity-100");
      expect(boton.className).toContain("pointer-fine:group-focus-within:opacity-100");
    }
    expect(screen.getByText("1 / 3").className).toContain("pointer-fine:opacity-0");
    expect(screen.getByText("Ampliar").className).toContain("pointer-fine:opacity-0");
  });
});
