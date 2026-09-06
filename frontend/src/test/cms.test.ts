import { describe, expect, it } from "vitest";
import {
  descuentoAplicable,
  diasHabitilesConExtra,
  precioConDescuento,
  textoCms,
  recomendacionesDePaquetes,
} from "@/lib/cms";
import type { Paquete } from "@/lib/api/tipos";

function paquete(extra: Partial<Paquete>): Paquete {
  return {
    id: "1",
    nombre: "Paquete Validor",
    slug: "validor",
    tipo: "validor",
    descripcion: "Landing de 1 vista con 2 meses de soporte",
    precio: 199,
    moneda: "USD",
    vistasIncluidas: 1,
    soporteMeses: 2,
    diasEntrega: 10,
    features: [],
    imagen: null,
    galeria: [],
    detalles: [],
    activo: true,
    ...extra,
  };
}

describe("Reglas de negocio del CMS (helpers)", () => {
  it("el descuento solo aplica si la marquesina está activa", () => {
    const base = {
      marquesina: { texto: "", activo: false },
      descuento: { activo: true, porcentaje: 40 as const, mensaje: "", hasta: null },
    };
    expect(descuentoAplicable(base)).toBe(false);
    expect(descuentoAplicable({ ...base, marquesina: { texto: "40%", activo: true } })).toBe(true);
    expect(
      descuentoAplicable({
        marquesina: { texto: "40%", activo: true },
        descuento: { activo: false, porcentaje: 40 as const, mensaje: "", hasta: null },
      }),
    ).toBe(false);
  });

  it("precio con descuento: 180 con 40% → 108, y con 70% → 54", () => {
    expect(precioConDescuento(180, 40)).toBe(108);
    expect(precioConDescuento(180, 70)).toBe(54);
    expect(precioConDescuento(180, 20)).toBe(144);
  });

  it("días hábiles con tiempo extra global solo se suman al mostrar", () => {
    expect(diasHabitilesConExtra(10, 5)).toBe(15);
    expect(diasHabitilesConExtra(10, 0)).toBe(10);
  });

  it("texto CMS devuelve fallback si la clave no existe o está vacía", () => {
    const textos = { "productos.titulo": "Paquetes", "hero.titulo": "" };
    expect(textoCms(textos, "productos.titulo", "Productos")).toBe("Paquetes");
    expect(textoCms(textos, "hero.titulo", "Título por defecto")).toBe("Título por defecto");
    expect(textoCms(undefined, "no.existe", "Fallback")).toBe("Fallback");
  });

  it("genera una recomendación por cada paquete (se adapta a los que existan)", () => {
    const res = recomendacionesDePaquetes([
      paquete({}),
      paquete({ id: "2", nombre: "Paquete Operativo", slug: "operativo", tipo: "operativo", vistasIncluidas: 4, soporteMeses: 12, diasEntrega: 45 }),
    ]);
    expect(res).toHaveLength(2);
    expect(res[0].paqueteId).toBe("1");
    expect(res[0].pregunta).toContain("Paquete Validor");
    expect(res[1].slug).toBe("operativo");
    expect(res[1].detalles).toContain("4 vistas");
    expect(res[1].detalles).toContain("12 meses");
  });
});
