import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { FormularioProducto } from "@/pages/admin/formulario-producto";

function usar(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <FormularioProducto />
    </MemoryRouter>,
  );
}

describe("Formulario de producto", () => {
  it("al crear, el slug se genera desde el nombre al salir del campo", async () => {
    global.fetch = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))) as unknown as typeof fetch;
    usar("/admin/productos/nuevo");

    await waitFor(() => expect(screen.getByLabelText("Nombre")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Mi Paquete increíble" } });
    fireEvent.blur(screen.getByLabelText("Nombre"));

    await waitFor(() => expect(screen.getByLabelText("Slug")).toHaveValue("mi-paquete-increible"));
  });

  it("llama a crearPaquete al enviar el formulario de nuevo", async () => {
    const fetchMock = vi.fn((url: string) => {
      const u = String(url);
      if (u.includes("/paquetes/") && u.includes("/galeria")) {
        return Promise.resolve(new Response(JSON.stringify({ item: {} }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ paquete: { id: "nuevo-1" } }), { status: 201 }));
    }) as unknown as typeof fetch;
    global.fetch = fetchMock;

    usar("/admin/productos/nuevo");

    // Llenar mínimos
    await waitFor(() => fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Nuevo Paquete" } }));
    fireEvent.blur(screen.getByLabelText("Nombre"));
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción de prueba de más de 10 caracteres" } });
    fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "150" } });

    fireEvent.click(screen.getByRole("button", { name: /crear producto/i }));

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find((c) => String(c[0]).includes("/api/v1/paquetes") && String(c[1]?.method) === "POST");
      expect(llamada).toBeTruthy();
    });
  });
});
