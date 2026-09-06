/**
 * Tipos de la API MainPlataform/DaJu (contrato OpenAPI en /api-docs/spec.json).
 * En el futuro se generan con openapi-typescript; por ahora se mantienen a mano
 * y SOLO se usan los campos que la vitrina consume.
 */

export interface CmsPublico {
  logo: { url: string; publicId: string } | null;
  colores: { primario: string; secundario: string; acento: string };
  marquesina: { texto: string; activo: boolean };
  carrusel: CarruselItem[];
  textos: Record<string, string>;
  descuento: DescuentoCms;
  diasExtra: number;
}

/** Descuento global de la vitrina (solo se aplica si la marquesina lo anuncia). */
export interface DescuentoCms {
  activo: boolean;
  porcentaje: 20 | 40 | 70;
  mensaje: string;
  hasta: string | null;
}

/** Respuesta del editor (solo admin): publicado + borrador pendiente. */
export interface CmsEditorRespuesta {
  publicado: {
    colores: CmsPublico["colores"];
    marquesina: CmsPublico["marquesina"];
    textos: Record<string, string>;
    descuento: DescuentoCms;
    diasExtra: number;
  };
  editor: {
    colores?: Partial<CmsPublico["colores"]>;
    marquesina?: Partial<CmsPublico["marquesina"]>;
    textos?: Record<string, string>;
    descuento?: Partial<DescuentoCms>;
    diasExtra?: number;
  };
}

export interface CarruselItem {
  id: string;
  imagen: { url: string; publicId: string };
  link: string;
  titulo: string;
  activo: boolean;
  orden: number;
}

export interface Paquete {
  id: string;
  nombre: string;
  slug: string;
  tipo: "validor" | "corporativo" | "operativo";
  descripcion: string;
  precio: number;
  moneda: string;
  vistasIncluidas: number;
  soporteMeses: number;
  diasEntrega: number;
  features: string[];
  imagen: { url: string; publicId: string } | null;
  galeria: Array<{ url: string; publicId: string }>;
  detalles: Array<{ titulo: string; texto: string }>;
  activo: boolean;
}

/** Cuerpo para crear/actualizar un paquete (contrato POST/PUT de la API). */
export interface PaqueteInput {
  nombre: string;
  slug: string;
  tipo: "validor" | "corporativo" | "operativo";
  descripcion: string;
  precio: number;
  moneda: string;
  vistasIncluidas: number;
  soporteMeses: number;
  diasEntrega: number;
  features?: string[];
  detalles?: Array<{ titulo: string; texto: string }>;
  activo?: boolean;
}

/** Paquete con imagen de portada (para el listado admin). */
export type PaqueteAdmin = Paquete;

/** Oferta de la vitrina: plantilla o consultoría (servicio). */
export interface Oferta {
  id: string;
  tipo: "plantilla" | "consultoria";
  nombre: string;
  descripcion: string;
  features: string[];
  desde: number | null;
  para: string;
  activo: boolean;
  orden: number;
}

export interface OfertaInput {
  tipo: "plantilla" | "consultoria";
  nombre: string;
  descripcion: string;
  features?: string[];
  desde?: number | null;
  para?: string;
  activo?: boolean;
  orden?: number;
}

export type CategoriaFuncionalidad =
  | "integraciones"
  | "pagina"
  | "usuarios"
  | "datos";

export interface FuncionalidadExtra {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaFuncionalidad;
  complejidad: "facil" | "media" | "dificil";
  precio: number;
  activo: boolean;
}

export interface CheckoutResultado {
  urlPago: string | null;
  pago: {
    id: string;
    monto: number;
    moneda: string;
    estado: string;
  };
}

export interface ContactoMensaje {
  id: string;
  nombre: string;
  email: string;
}

/** Publicaciones del blog (sin fechas ni autores públicos). */
export interface Publicacion {
  id: string;
  titulo: string;
  slug: string;
  tipo: "concepto" | "noticia";
  resumen: string;
  contenido: string;
  secciones: Array<"inicio" | "productos" | "faq" | "postventa">;
}

/** Errores de la API (formato uniforme). */
export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
