import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BarraEtapas } from "@/components/portal/barra-etapas";
import type { EtapaPortal } from "@/lib/api/tipos";

const etapas: EtapaPortal[] = [
  {
    _id: "1",
    nombre: "Planeación y diseño",
    descripcion: "",
    orden: 1,
    monto: 0,
    requierePago: false,
    pagoEstado: "no_requerido",
    estado: "completada",
    pagoId: null,
    completadaEn: null,
  },
  {
    _id: "2",
    nombre: "Inicio de desarrollo",
    descripcion: "",
    orden: 2,
    monto: 400,
    requierePago: true,
    pagoEstado: "solicitado",
    estado: "bloqueada",
    pagoId: "pago1",
    completadaEn: null,
  },
  {
    _id: "3",
    nombre: "Despliegue",
    descripcion: "",
    orden: 3,
    monto: 200,
    requierePago: true,
    pagoEstado: "pendiente",
    estado: "bloqueada",
    pagoId: null,
    completadaEn: null,
  },
];

describe("Barra de etapas", () => {
  it("avisa el pago pendiente, conserva el avance y dispara el pago", async () => {
    const onPagar = vi.fn();
    render(
      <BarraEtapas
        etapas={etapas}
        montoPagado={0}
        montoTotal={600}
        moneda="USD"
        onPagar={onPagar}
      />,
    );

    expect(screen.getByText(/1 de 3 etapas completadas/)).toBeInTheDocument();
    expect(screen.getByText(/Pagado \$0 de \$600 USD/)).toBeInTheDocument();
    expect(
      screen.getByText(/Realiza el pago para poder continuar con esta etapa/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Se desbloqueará cuando el equipo habilite/i),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Pagar etapa/i }),
    );
    expect(onPagar).toHaveBeenCalledWith("pago1");
  });
});
