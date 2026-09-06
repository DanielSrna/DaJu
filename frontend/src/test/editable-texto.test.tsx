import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditableTexto } from "@/components/editor/editable-texto";

describe("EditableTexto", () => {
  it("solo admin puede ver el lapicito; el texto se muestra con fallback", async () => {
    render(
      <EditableTexto
        modoEdicion={false}
        clave="hero.titulo"
        valor="Fallback"
        textos={{}}
        onGuardar={async () => {}}
      />,
    );
    expect(screen.getByText("Fallback")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();

    // recarga con modo edición
    render(
      <EditableTexto
        modoEdicion={true}
        clave="hero.titulo"
        valor="Título real"
        textos={{ "hero.titulo": "Título real" }}
        onGuardar={async () => {}}
      />,
    );
    expect(screen.getByText("Título real")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });

  it("al abrir el editor se puede cambiar el texto y guardar", async () => {
    const guardar = vi.fn(async () => {});
    render(
      <EditableTexto
        modoEdicion={true}
        clave="hero.titulo"
        valor="Antes"
        textos={{ "hero.titulo": "Antes" }}
        onGuardar={guardar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Después" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(guardar).toHaveBeenCalledWith("hero.titulo", "Después"));
    expect(await screen.findByText("Después")).toBeInTheDocument();
  });
});
