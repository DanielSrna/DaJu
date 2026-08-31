import { addBusinessDays } from "../src/utils/fechas";

describe("addBusinessDays", () => {
  it("suma días hábiles saltando fines de semana", () => {
    const viernes = new Date("2026-08-28T10:00:00Z");
    const resultado = addBusinessDays(viernes, 1);
    expect(resultado.toISOString().slice(0, 10)).toBe("2026-08-31");
  });

  it("salta varios fines de semana seguidos", () => {
    const viernes = new Date("2026-08-28T10:00:00Z");
    const resultado = addBusinessDays(viernes, 3);
    expect(resultado.toISOString().slice(0, 10)).toBe("2026-09-02");
  });

  it("devuelve la misma fecha si los días son cero", () => {
    const fecha = new Date("2026-08-28T10:00:00Z");
    expect(addBusinessDays(fecha, 0).toISOString().slice(0, 10)).toBe("2026-08-28");
  });

  it("maneja meses que cambian de mes", () => {
    const jueves = new Date("2026-08-27T10:00:00Z");
    const resultado = addBusinessDays(jueves, 5);
    expect(resultado.toISOString().slice(0, 10)).toBe("2026-09-03");
  });
});
