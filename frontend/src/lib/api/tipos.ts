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
  /** Pesos por dólar para pagos locales (0 = sin conversión). */
  tasaCop?: number;
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
  garantia: string;
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
  garantia: string;
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

export interface Plantilla {
  id: string;
  nombre: string;
  slug: string;
  plataforma: string;
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

/** Cuerpo para crear/actualizar una plantilla (contrato POST/PUT de la API). */
export interface PlantillaInput {
  nombre: string;
  slug: string;
  plataforma: string;
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

export type CategoriaServicio = "auditoria" | "asesoria" | "aceleracion";

export interface Servicio {
  id: string;
  nombre: string;
  slug: string;
  categoria: CategoriaServicio;
  descripcion: string;
  precio: number;
  moneda: string;
  duracionMin: number;
  canal: "Meet" | "Zoom";
  incluye: string[];
  detalles: Array<{ titulo: string; texto: string }>;
  activo: boolean;
}

/** Cuerpo para crear/actualizar un servicio (contrato POST/PUT de la API). */
export interface ServicioInput {
  nombre: string;
  slug: string;
  categoria: CategoriaServicio;
  descripcion: string;
  precio: number;
  moneda: string;
  duracionMin?: number;
  canal?: "Meet" | "Zoom";
  incluye?: string[];
  detalles?: Array<{ titulo: string; texto: string }>;
  activo?: boolean;
}

/** Familia comprada; define el entorno de acceso (contrato de pagos). */
export type TipoProducto = "paquete" | "plantilla" | "servicio";

/** Etapa del plan de trabajo (barra de progreso personalizable). */
export interface EtapaPortal {
  _id: string;
  nombre: string;
  descripcion: string;
  orden: number;
  monto: number;
  requierePago: boolean;
  pagoEstado: "no_requerido" | "pendiente" | "solicitado" | "pagado";
  estado: "bloqueada" | "en_curso" | "completada";
  pagoId: string | null;
  completadaEn: string | null;
}

/** Resultado de POST /cotizaciones (registro con producto, sin pago). */
export interface CotizacionResultado {
  entorno: {
    tipo: "proyecto" | "espacio";
    id: string;
    tipoProducto: TipoProducto;
    productoSlug: string;
    productoNombre: string;
    estado: string;
  };
  usuario: {
    id: string;
    email: string;
    nombre: string;
    rol: "admin" | "cliente";
    emailVerificado: boolean;
  };
  nuevo: boolean;
}

/** Resumen del portal del cliente (GET /cliente/resumen). */
export interface ResumenPortal {
  proyectos: Array<{
    id: string;
    nombre: string;
    slug: string;
    estado: string;
    fechaEntrega: string | null;
    progreso: number;
    /** Presente cuando el resumen es de administrador (todos los clientes). */
    clienteNombre?: string;
    clienteId?: string;
  }>;
  espacios: Array<{
    id: string;
    tipoProducto: "plantilla" | "servicio";
    productoSlug: string;
    sesiones: { total: number; usadas: number };
    estado: "planeacion" | "activo" | "completado";
    clienteNombre?: string;
    clienteId?: string;
  }>;
  pagos: Array<{
    id: string;
    tipoProducto: TipoProducto;
    productoSlug: string;
    monto: number;
    moneda: string;
    cantidad: number;
    createdAt: string;
  }>;
}

/** Chat del portal (contexto: proyecto | espacio | vista). */
export interface MensajeChat {
  id: string;
  contexto: "proyecto" | "espacio" | "vista";
  contextoId: string;
  autorTipo: "admin" | "cliente";
  autorId: string;
  cuerpo: string;
  archivos: Array<{ url: string; publicId: string; nombre: string; mime: string }>;
  createdAt: string;
}

export interface EspacioPortal {
  id: string;
  clienteId: string;
  tipoProducto: "plantilla" | "servicio";
  productoSlug: string;
  pagoId: string;
  estado: "planeacion" | "activo" | "completado";
  precioBase?: number;
  moneda?: string;
  etapas?: EtapaPortal[];
  etapasCompletadas?: number;
  etapasTotal?: number;
  montoPagado?: number;
  montoTotal?: number;
  sesiones: { total: number; usadas: number };
}

export interface CitaPortal {
  id: string;
  espacioId: string;
  sesion: number;
  propuestas: string[];
  confirmada: string | null;
  duracionMin: number;
  canal: "Meet" | "Zoom";
  estado: "propuesta" | "confirmada" | "realizada" | "cancelada";
  linkVideollamada: string;
  notas: string;
  createdAt: string;
}

export interface VistaDisenoPortal {
  id: string;
  espacioId: string;
  nombre: string;
  orden: number;
  estado: "pendiente" | "negociacion" | "cotizacion" | "aprobada";
  muestraCliente: { url: string; publicId: string } | null;
  obraGris: { url: string; publicId: string } | null;
  archivos: Array<{
    url: string;
    publicId: string;
    nombre: string;
    mimeType: string;
    tamañoBytes: number;
  }>;
  createdAt: string;
}

export interface SolicitudFuncion {
  id: string;
  espacioId: string;
  titulo: string;
  descripcion: string;
  estado: "abierta" | "respondida" | "aceptada" | "pagada";
  costo: number;
  /** Precio de catálogo sugerido cuando la función viene de la lista. */
  costoSugerido: number;
  origen: "personalizada" | "catalogo";
  catalogoClave: string;
  respuestaAdmin: string;
  createdAt: string;
}

export interface Notificacion {
  id: string;
  tipo: "plataforma" | "proyecto";
  paraAdmin: boolean;
  titulo: string;
  cuerpo: string;
  contexto: string;
  contextoId: string | null;
  leida: boolean;
  createdAt: string;
}

/** Briefing v2 (contenido guiado por vistas y semáforos). */
export interface PreferenciaIdentidad {
  tipo: "lista" | "libre" | "dev";
  valor: string;
  notas: string;
}

export interface VistaBriefingPortal {
  id: string;
  nombre: string;
  requisitos: string;
  semaforo: "pendiente" | "negociacion" | "cotizacion" | "aprobada";
  obraGris?: { url: string; publicId: string } | null;
  archivos?: Array<{
    url: string;
    publicId: string;
    nombre: string;
    mimeType: string;
    tamañoBytes: number;
  }>;
}

export interface BriefingV2Contenido {
  empresa?: string;
  descripcionNegocio?: string;
  objetivos?: string;
  requerimientos?: string;
  resumen?: {
    nombreProyecto?: string;
    descripcionNegocio?: string;
    objetivos?: string;
    problemaActual?: string;
    flujoPrincipal?: string;
    ejemploFlujo?: string;
    plazoDeseado?: string;
    noIncluir?: string;
    referenciasLinks?: string;
    identidadActual?: string;
    idioma?: string;
    usuarios?: { cantidad?: number; tipos?: string[]; permisos?: string[] };
  };
  vistas?: VistaBriefingPortal[];
  identidad?: {
    fuentes?: PreferenciaIdentidad;
    colores?: PreferenciaIdentidad;
    vibra?: PreferenciaIdentidad;
  };
}

export interface BriefingV2 {
  id: string;
  proyectoId: string;
  contenido: BriefingV2Contenido;
  completado: boolean;
  archivos?: Array<{
    id: string;
    url: string;
    publicId: string;
    nombre: string;
    mimeType: string;
    tamañoBytes: number;
  }>;
}

export interface PagoItem {
  id: string;
  tipoProducto: "paquete" | "plantilla" | "servicio" | "funcionalidad";
  tipoPago: "total" | "etapa" | "sesiones" | "funcionalidad";
  productoSlug: string;
  descripcion: string;
  monto: number;
  moneda: string;
  montoCop: number | null;
  emailCliente: string;
  estado:
    | "pending"
    | "en_revision"
    | "paid"
    | "failed"
    | "rechazado"
    | "refunded";
  referencia: string | null;
  metodoPago: string;
  codigo: string;
  comprobante: {
    url: string;
    nombre: string;
    subidoEn: string | null;
  } | null;
  referenciaCliente: string;
  proyectoId: string;
  espacioId: string;
  etapaId: string;
  motivoRechazo: string;
  cantidad: number;
  createdAt: string;
}

/** Método de pago configurable desde el panel admin. */
export interface MetodoPago {
  id: string;
  nombre: string;
  clave: string;
  tipo: "manual" | "paypal";
  moneda: "COP" | "USD";
  titular: string;
  datos: string;
  instrucciones: string;
  qrUrl: string;
  activo: boolean;
  orden: number;
}

export interface MetodoPagoInput {
  nombre: string;
  tipo?: "manual" | "paypal";
  moneda?: "COP" | "USD";
  titular?: string;
  datos?: string;
  instrucciones?: string;
  qrUrl?: string;
  activo?: boolean;
  orden?: number;
}

export interface ElegirMetodoResultado {
  pago: PagoItem;
  metodo: MetodoPago;
  montoCop: number | null;
  urlPago: string | null;
}

/** Prueba del informe técnico (rendimiento, seguridad o test). */
export interface PruebaInforme {
  id: string;
  tipo: "rendimiento" | "seguridad" | "test";
  titulo: string;
  descripcion: string;
  calificacion: number | null;
  exitoso: boolean | null;
  createdAt: string;
}

/** Resumen del informe técnico que ve el cliente (detalle solo en el PDF). */
export interface InformeResumen {
  entorno: {
    tipo: "proyecto" | "espacio";
    id: string;
    nombre: string;
    estado: string;
    moneda: string;
    cliente: string;
  };
  vistas: number;
  funciones: number;
  costoTotal: number;
  montoPagado: number;
  impacto: { porcentaje: number | null; descripcion: string };
  rendimiento: { total: number; promedio: number | null };
  seguridad: { total: number; promedio: number | null };
  tests: { total: number; aprobados: number };
  /** Solo llega para el admin (el cliente lo ve en el PDF). */
  pruebas?: PruebaInforme[];
}

export interface GarantiaInfo {
  activa: boolean;
  soporteMeses: number;
  fechaInicio: string;
  fechaExpiracion: string;
  diasRestantes: number;
}

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
    tipoProducto: TipoProducto;
    productoSlug: string;
    cantidad: number;
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
  publicado?: boolean;
}

/** Cuerpo para crear/actualizar una publicación (contrato API). */
export interface PublicacionInput {
  titulo: string;
  slug?: string;
  tipo: "concepto" | "noticia";
  resumen: string;
  contenido: string;
  secciones?: Array<"inicio" | "productos" | "faq" | "postventa">;
  publicado?: boolean;
}

/** Errores de la API (formato uniforme). */
export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
