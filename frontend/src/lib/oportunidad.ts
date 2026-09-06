/**
 * Cálculo ilustrativo de la calculadora de oportunidad del home:
 * clientes potenciales captados por mes × ticket promedio.
 * Es una estimación simple, no una promesa de resultados.
 */
export function calcularOportunidad(
  clientes: number,
  ticket: number,
): { mensual: number; anual: number } {
  const mensual = Math.max(0, clientes) * Math.max(0, ticket);
  return { mensual, anual: mensual * 12 };
}
