/**
 * Cálculo de fechas del negocio.
 * Entrega = fecha de compra congelada + días hábiles del paquete (gestor de capacidad puede ajustarlos).
 * Días hábiles: de lunes a viernes (sin festivos por ahora; se puede ampliar con calendario).
 */
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  result.setUTCHours(12, 0, 0, 0);

  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return result;
}
