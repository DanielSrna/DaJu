import { describe, expect, it } from "vitest";
import { calcularOportunidad } from "@/lib/oportunidad";

describe("Calculadora de oportunidad", () => {
  it("multiplica clientes por ticket (=ingresos mensuales estimados)", () => {
    expect(calcularOportunidad(20, 150000)).toEqual({
      mensual: 3000000,
      anual: 36000000,
    });
  });

  it("con 0 clientes el resultado es 0", () => {
    expect(calcularOportunidad(0, 50000)).toEqual({ mensual: 0, anual: 0 });
  });
});
