import type { CmsPublico, Paquete } from "@/lib/api/tipos";

/**
 * Reglas de negocio del CMS para la vitrina (helpers puros y testeables):
 * - El descuento global SOLO se aplica si la marquesina está activa (regla del
 *   dueño: "no hay descuentos si no están anunciados en la barra").
 * - El tiempo extra global se suma solo al momento de mostrar (compras nuevas).
 */

export function descuentoAplicable(cms: Pick<CmsPublico, "marquesina" | "descuento">): boolean {
  return cms.marquesina.activo && cms.descuento.activo;
}

/** Precio con descuento (entero, redondeado hacia abajo como un negocio de COP). */
export function precioConDescuento(precioBase: number, porcentaje: number): number {
  return Math.floor(precioBase * (1 - porcentaje / 100));
}

/** Días hábiles a mostrar en vitrina (tiempo extra global solo en compras nuevas). */
export function diasHabitilesConExtra(diasBase: number, diasExtra: number): number {
  return diasBase + diasExtra;
}

/** Texto del CMS con fallback (si el admin aún no lo personalizó). */
export function textoCms(textos: Record<string, string> | undefined, clave: string, porDefecto: string): string {
  const valor = textos?.[clave];
  return valor && valor.trim().length > 0 ? valor : porDefecto;
}

const DESCRIPCION_TIPO: Record<Paquete["tipo"], string> = {
  validor: "para arrancar rápido",
  corporativo: "para crecer con presencia",
  operativo: "para digitalizar tu operación",
};

export interface Recomendacion {
  tipo: Paquete["tipo"];
  pregunta: string;
  texto: string;
  detalles: string;
  paqueteId: string;
  slug: string;
}

/**
 * Genera una recomendación por cada paquete activo, a partir de sus datos.
 * Así la sección "¿No sabes qué elegir?" se adapta a los productos que existan
 * (incluso si el admin agrega más paquetes o cambia los existentes).
 */
export function recomendacionesDePaquetes(paquetes: Paquete[]): Recomendacion[] {
  return paquetes.map((p) => ({
    tipo: p.tipo,
    pregunta: `${p.nombre} — ${DESCRIPCION_TIPO[p.tipo]}`,
    texto: p.descripcion,
    detalles: `${p.vistasIncluidas} vista${p.vistasIncluidas === 1 ? "" : "s"} · ${p.soporteMeses} meses de soporte · ~${p.diasEntrega} días hábiles`,
    paqueteId: p.id,
    slug: p.slug,
  }));
}
