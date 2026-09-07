import type {
  CmsPublico,
  CmsEditorRespuesta,
  Paquete,
  PaqueteInput,
  Plantilla,
  PlantillaInput,
  Servicio,
  ServicioInput,
  TipoProducto,
  Oferta,
  OfertaInput,
  FuncionalidadExtra,
  CheckoutResultado,
  ContactoMensaje,
  Publicacion,
  PublicacionInput,
  ResumenPortal,
  MensajeChat,
  EspacioPortal,
  CitaPortal,
  VistaDisenoPortal,
  SolicitudFuncion,
  BriefingV2,
  Notificacion,
  PagoItem,
  ApiError,
} from "./tipos";

/** Base de la API: absoluta (VITE_API_URL) en producción cross-site, relativa en dev. */
export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1";

/** Arma una ruta absoluta/relativa según la configuración (uso externo al cliente). */
export function apiUrl(ruta: string): string {
  return `${API_BASE}${ruta}`;
}

async function peticion<T>(url: string, opciones?: RequestInit): Promise<T> {
  const esJson = typeof opciones?.body === "string";
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: "include",
    headers: esJson
      ? { "Content-Type": "application/json" }
      : undefined,
    ...opciones,
  });

  if (!res.ok) {
    let error: ApiError;
    try {
      error = (await res.json()) as ApiError;
    } catch {
      error = {
        error: { code: "INTERNAL_ERROR", message: "Error inesperado" },
      };
    }
    const e = new Error(error.error.message) as Error & { code?: string };
    e.code = error.error.code;
    throw e;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  cms: () => peticion<CmsPublico>("/cms"),

  login: (datos: { email: string; password: string }) =>
    peticion<{ user: { id: string; email: string; nombre: string; rol: "admin" | "cliente" } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(datos) },
    ),

  logout: () =>
    peticion<unknown>("/auth/logout", { method: "POST" }),

  cmsEditor: () => peticion<CmsEditorRespuesta>("/cms/editor"),
  patchEditor: (datos: {
    colores?: Partial<CmsPublico["colores"]>;
    marquesina?: Partial<CmsPublico["marquesina"]>;
    textos?: Record<string, string>;
    descuento?: Partial<CmsPublico["descuento"]>;
    diasExtra?: number;
  }) =>
    peticion<CmsEditorRespuesta>("/cms/editor", {
      method: "PATCH",
      body: JSON.stringify(datos),
    }),
  publicarCms: () =>
    peticion<{ publicado: CmsPublico }>("/cms/publicar", { method: "POST" }),

  paquetes: () => peticion<{ paquetes: Paquete[] }>("/paquetes"),
  paquetePorSlug: (slug: string) =>
    peticion<{ paquete: Paquete }>(`/paquetes/${slug}`),

  plantillas: () => peticion<{ plantillas: Plantilla[] }>("/plantillas"),
  plantillaPorSlug: (slug: string) =>
    peticion<{ plantilla: Plantilla }>(`/plantillas/${slug}`),

  servicios: () => peticion<{ servicios: Servicio[] }>("/servicios"),
  servicioPorSlug: (slug: string) =>
    peticion<{ servicio: Servicio }>(`/servicios/${slug}`),

  /** Admin: crear una plantilla. */
  crearPlantilla: (datos: PlantillaInput) =>
    peticion<{ plantilla: Plantilla }>("/plantillas", {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  /** Admin: actualizar una plantilla por su id. */
  actualizarPlantilla: (id: string, datos: Partial<PlantillaInput>) =>
    peticion<{ plantilla: Plantilla }>(`/plantillas/${id}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    }),
  /** Admin: eliminar plantilla (permanente). */
  eliminarPlantilla: (id: string) =>
    peticion<unknown>(`/plantillas/${id}`, { method: "DELETE" }),
  /** Admin: subir imagen de portada de plantilla. */
  subirImagenPortadaPlantilla: (id: string, blob: Blob) => {
    const form = new FormData();
    form.append("imagen", blob);
    return peticion<{ plantilla: Plantilla }>(`/plantillas/${id}/imagen`, {
      method: "POST",
      body: form,
    });
  },
  /** Admin: agregar imagen a la galería de la plantilla. */
  subirImagenGaleriaPlantilla: (id: string, blob: Blob) => {
    const form = new FormData();
    form.append("imagen", blob);
    return peticion<{ plantilla: Plantilla }>(`/plantillas/${id}/galeria`, {
      method: "POST",
      body: form,
    });
  },
  /** Admin: eliminar una imagen de la galería de la plantilla. */
  eliminarImagenGaleriaPlantilla: (id: string, publicId: string) =>
    peticion<unknown>(`/plantillas/${id}/galeria/${publicId}`, {
      method: "DELETE",
    }),

  /** Admin: crear un servicio. */
  crearServicio: (datos: ServicioInput) =>
    peticion<{ servicio: Servicio }>("/servicios", {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  /** Admin: actualizar un servicio por su id. */
  actualizarServicio: (id: string, datos: Partial<ServicioInput>) =>
    peticion<{ servicio: Servicio }>(`/servicios/${id}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    }),
  /** Admin: eliminar servicio (permanente). */
  eliminarServicio: (id: string) =>
    peticion<unknown>(`/servicios/${id}`, { method: "DELETE" }),

  /** Admin: crear un paquete. */
  crearPaquete: (datos: PaqueteInput) =>
    peticion<{ paquete: Paquete }>("/paquetes", {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  /** Admin: actualizar un paquete por su id. */
  actualizarPaquete: (id: string, datos: Partial<PaqueteInput>) =>
    peticion<{ paquete: Paquete }>(`/paquetes/${id}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    }),
  /** Admin: eliminar paquete (permanente). */
  eliminarPaquete: (id: string) =>
    peticion<unknown>(`/paquetes/${id}`, { method: "DELETE" }),

  /** Ofertas activas (vitrina pública). */
  ofertas: () => peticion<{ ofertas: Oferta[] }>("/ofertas"),
  /** Admin: todas las ofertas (incluye inactivas). */
  ofertasAdmin: () => peticion<{ ofertas: Oferta[] }>("/ofertas/admin"),
  crearOferta: (datos: OfertaInput) =>
    peticion<{ oferta: Oferta }>("/ofertas", {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  actualizarOferta: (id: string, datos: Partial<OfertaInput>) =>
    peticion<{ oferta: Oferta }>(`/ofertas/${id}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    }),
  eliminarOferta: (id: string) =>
    peticion<unknown>(`/ofertas/${id}`, { method: "DELETE" }),
  /** Admin: subir imagen de portada. */
  subirImagenPortada: (id: string, blob: Blob) => {
    const form = new FormData();
    form.append("imagen", blob);
    return peticion<{ paquete: Paquete }>(`/paquetes/${id}/imagen`, {
      method: "POST",
      body: form,
    });
  },
  /** Admin: agregar imagen a la galería. */
  subirImagenGaleria: (id: string, blob: Blob) => {
    const form = new FormData();
    form.append("imagen", blob);
    return peticion<{ item: { url: string; publicId: string } }>(`/paquetes/${id}/galeria`, {
      method: "POST",
      body: form,
    });
  },
  /** Admin: eliminar una imagen de la galería. */
  eliminarImagenGaleria: (id: string, publicId: string) =>
    peticion<unknown>(`/paquetes/${id}/galeria/${publicId}`, { method: "DELETE" }),

  funcionalidades: () =>
    peticion<{ funcionalidades: FuncionalidadExtra[] }>("/funcionalidades"),

  publicaciones: (params?: { tipo?: string; seccion?: string }) => {
    const q = new URLSearchParams();
    if (params?.tipo) q.set("tipo", params.tipo);
    if (params?.seccion) q.set("seccion", params.seccion);
    const cadena = q.toString();
    return peticion<{ publicaciones: Publicacion[]; total: number }>(
      `/publicaciones${cadena ? `?${cadena}` : ""}`,
    );
  },
  publicacionPorSlug: (slug: string) =>
    peticion<{ publicacion: Publicacion }>(`/publicaciones/${slug}`),

  /** Admin: crear una publicación. */
  crearPublicacion: (datos: PublicacionInput) =>
    peticion<{ publicacion: Publicacion }>("/publicaciones", {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  actualizarPublicacion: (id: string, datos: Partial<PublicacionInput>) =>
    peticion<{ publicacion: Publicacion }>(`/publicaciones/${id}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    }),
  eliminarPublicacion: (id: string) =>
    peticion<unknown>(`/publicaciones/${id}`, { method: "DELETE" }),

  checkout: (datos: {
    tipoProducto?: TipoProducto;
    paqueteId?: string;
    productoId?: string;
    cantidad?: number;
    nombre: string;
    email: string;
    password: string;
    funcionalidades?: string[];
    negociarDespues?: boolean;
  }) =>
    peticion<CheckoutResultado>("/checkout", {
      method: "POST",
      body: JSON.stringify(datos),
    }),

  contacto: (datos: {
    nombre: string;
    email: string;
    asunto?: string;
    mensaje: string;
    _website?: string;
  }) =>
    peticion<{ mensaje: ContactoMensaje }>("/contacto", {
      method: "POST",
      body: JSON.stringify(datos),
    }),

  sitioProyectos: () => peticion<{ proyectos: Array<{ id: string; nombre: string; slug: string; estado: string; fechaEntrega: string | null }> }>("/proyectos"),

  /* ================= Portal del cliente (fase 2) ================= */

  proyectoPorId: (id: string) =>
    peticion<{
      proyecto: {
        id: string;
        cliente: { id: string; email: string; nombre: string };
        paquete: { nombre: string; slug: string; tipo: string; soporteMeses: number };
        estado: string;
        fechaCompra: string;
        fechaEntrega: string;
        fechaEntregado: string | null;
      };
    }>(`/proyectos/${id}`),

  resumenPortal: () => peticion<ResumenPortal>("/cliente/resumen"),

  forgot: (email: string) =>
    peticion<{ ok: boolean }>("/auth/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  reset: (token: string, password: string) =>
    peticion<{ ok: boolean }>("/auth/reset", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  misPagos: () => peticion<{ pagos: PagoItem[] }>("/pagos/mis-pagos"),
  pagosAdmin: () => peticion<{ pagos: PagoItem[] }>("/pagos"),
  reembolsarPago: (id: string) =>
    peticion<{ pago: PagoItem }>(`/pagos/${id}/reembolsar`, { method: "POST" }),

  proyectosAdmin: (filtros?: { estado?: string; q?: string }) => {
    const q = new URLSearchParams();
    if (filtros?.estado) q.set("estado", filtros.estado);
    if (filtros?.q) q.set("q", filtros.q);
    q.set("limite", "100");
    const cadena = q.toString();
    return peticion<{
      proyectos: Array<{
        id: string;
        cliente: { nombre: string; email: string };
        paquete: { nombre: string; slug: string; tipo: string; soporteMeses: number };
        estado: string;
        fechaEntrega: string;
      }>;
      total: number;
      pagina: number;
      totalPaginas: number;
    }>(`/proyectos/admin${cadena ? `?${cadena}` : ""}`);
  },
  moverEstadoProyecto: (id: string, estado: string) =>
    peticion<{ proyecto: unknown }>(`/proyectos/${id}/estado`, {
      method: "PUT",
      body: JSON.stringify({ estado }),
    }),
  garantiaProyecto: (id: string) =>
    peticion<{ garantia: import("./tipos").GarantiaInfo }>(`/proyectos/${id}/garantia`),
  bitacoraProyecto: (id: string) =>
    peticion<{ entradas: Array<{ id: string; tipo: string; mensaje: string; usuarioNombre: string; createdAt: string }> }>(
      `/proyectos/${id}/bitacora`,
    ),
  metricasAdmin: () =>
    peticion<{
      ingresosMes: number;
      pagosMes: number;
      proyectosActivos: number;
      entornosPlantillas: number;
      entornosServicios: number;
      sesionesPendientes: number;
      citasPorConfirmar: number;
      solicitudesAbiertas: number;
    }>("/admin/metricas"),

  notificaciones: () =>
    peticion<{ notificaciones: Notificacion[] }>("/notificaciones"),
  notificacionesSinLeer: () =>
    peticion<{ total: number }>("/notificaciones/sin-leer"),
  marcarNotificacionLeida: (id: string) =>
    peticion<unknown>(`/notificaciones/${id}/leida`, { method: "PUT" }),

  mensajesChat: (contexto: string, contextoId: string) =>
    peticion<{ mensajes: MensajeChat[] }>(
      `/mensajes?contexto=${contexto}&contextoId=${contextoId}`,
    ),
  enviarMensaje: (datos: {
    contexto: string;
    contextoId: string;
    cuerpo: string;
  }) =>
    peticion<{ mensaje: MensajeChat }>("/mensajes", {
      method: "POST",
      body: JSON.stringify(datos),
    }),

  espacio: (id: string) => peticion<{ espacio: EspacioPortal }>(`/espacios/${id}`),

  citas: (espacioId: string) =>
    peticion<{ citas: CitaPortal[] }>(`/espacios/${espacioId}/citas`),
  proponerCita: (
    espacioId: string,
    datos: { propuestas: string[]; duracionMin?: number; canal?: "Meet" | "Zoom" },
  ) =>
    peticion<{ cita: CitaPortal }>(`/espacios/${espacioId}/citas`, {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  confirmarCita: (citaId: string, datos: { franja: string; linkVideollamada?: string }) =>
    peticion<{ cita: CitaPortal }>(`/citas/${citaId}/confirmar`, {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  realizarCita: (citaId: string) =>
    peticion<{ cita: CitaPortal }>(`/citas/${citaId}/realizar`, {
      method: "POST",
    }),
  cancelarCita: (citaId: string) =>
    peticion<{ cita: CitaPortal }>(`/citas/${citaId}/cancelar`, {
      method: "POST",
    }),

  vistasEspacio: (espacioId: string) =>
    peticion<{ vistas: VistaDisenoPortal[] }>(`/espacios/${espacioId}/vistas`),
  crearVista: (espacioId: string, nombre: string) =>
    peticion<{ vista: VistaDisenoPortal }>(`/espacios/${espacioId}/vistas`, {
      method: "POST",
      body: JSON.stringify({ nombre }),
    }),
  actualizarVista: (
    vistaId: string,
    datos: { estado?: string; nombre?: string },
  ) =>
    peticion<{ vista: VistaDisenoPortal }>(`/vistas/${vistaId}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    }),
  subirObraGris: (vistaId: string, blob: Blob) => {
    const form = new FormData();
    form.append("imagen", blob);
    return peticion<{ vista: VistaDisenoPortal }>(`/vistas/${vistaId}/obra-gris`, {
      method: "POST",
      body: form,
    });
  },
  subirMuestraVista: (vistaId: string, blob: Blob) => {
    const form = new FormData();
    form.append("imagen", blob);
    return peticion<{ vista: VistaDisenoPortal }>(`/vistas/${vistaId}/muestra`, {
      method: "POST",
      body: form,
    });
  },
  subirArchivoVista: (vistaId: string, blob: Blob) => {
    const form = new FormData();
    form.append("archivo", blob);
    return peticion<{ vista: VistaDisenoPortal }>(`/vistas/${vistaId}/archivos`, {
      method: "POST",
      body: form,
    });
  },
  eliminarArchivoVista: (vistaId: string, archivoId: string) =>
    peticion<{ vista: VistaDisenoPortal }>(
      `/vistas/${vistaId}/archivos/${archivoId}`,
      { method: "DELETE" },
    ),

  subirArchivoBriefing: (proyectoId: string, blob: Blob) => {
    const form = new FormData();
    form.append("archivo", blob);
    return peticion<{ briefing: BriefingV2 }>(`/briefing/${proyectoId}/archivos`, {
      method: "POST",
      body: form,
    });
  },
  eliminarArchivoBriefing: (proyectoId: string, archivoId: string) =>
    peticion<{ briefing: BriefingV2 }>(
      `/briefing/${proyectoId}/archivos/${archivoId}`,
      { method: "DELETE" },
    ),

  subirObraGrisBriefing: (proyectoId: string, vistaId: string, blob: Blob) => {
    const form = new FormData();
    form.append("imagen", blob);
    return peticion<{ briefing: BriefingV2 }>(
      `/briefing/${proyectoId}/vistas/${vistaId}/obra-gris`,
      { method: "POST", body: form },
    );
  },
  subirArchivoBriefingVista: (proyectoId: string, vistaId: string, blob: Blob) => {
    const form = new FormData();
    form.append("archivo", blob);
    return peticion<{ briefing: BriefingV2 }>(
      `/briefing/${proyectoId}/vistas/${vistaId}/archivos`,
      { method: "POST", body: form },
    );
  },
  eliminarArchivoBriefingVista: (
    proyectoId: string,
    vistaId: string,
    archivoId: string,
  ) =>
    peticion<{ briefing: BriefingV2 }>(
      `/briefing/${proyectoId}/vistas/${vistaId}/archivos/${archivoId}`,
      { method: "DELETE" },
    ),

  solicitudes: (espacioId: string) =>
    peticion<{ solicitudes: SolicitudFuncion[] }>(`/espacios/${espacioId}/solicitudes`),
  solicitudesProyecto: (proyectoId: string) =>
    peticion<{ solicitudes: SolicitudFuncion[] }>(`/proyectos/${proyectoId}/solicitudes`),
  crearSolicitud: (espacioId: string, datos: { titulo: string; descripcion: string }) =>
    peticion<{ solicitud: SolicitudFuncion }>(`/espacios/${espacioId}/solicitudes`, {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  responderSolicitud: (
    solicitudId: string,
    datos: { costo: number; respuestaAdmin: string },
  ) =>
    peticion<{ solicitud: SolicitudFuncion }>(`/solicitudes/${solicitudId}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    }),
  aceptarSolicitud: (solicitudId: string) =>
    peticion<{ urlPago: string | null; pago: { id: string; monto: number; moneda: string; estado: string } }>(
      `/solicitudes/${solicitudId}/aceptar`,
      { method: "POST" },
    ),

  briefingV2: (proyectoId: string) =>
    peticion<{ briefing: BriefingV2 }>(`/briefing/${proyectoId}`),
  crearVistaBriefing: (proyectoId: string, nombre: string) =>
    peticion<{ briefing: BriefingV2 }>(`/briefing/${proyectoId}/vistas`, {
      method: "POST",
      body: JSON.stringify({ nombre }),
    }),
  guardarBriefingV2: (proyectoId: string, contenido: BriefingV2["contenido"], completado?: boolean) =>
    peticion<{ briefing: BriefingV2 }>(`/briefing/${proyectoId}`, {
      method: "PUT",
      body: JSON.stringify({ contenido, ...(completado !== undefined ? { completado } : {}) }),
    }),
  actualizarVistaBriefing: (
    proyectoId: string,
    vistaId: string,
    datos: { requisitos?: string; semaforo?: "pendiente" | "negociacion" | "cotizacion" | "aprobada"; nombre?: string },
  ) =>
    peticion<{ briefing: BriefingV2 }>(
      `/briefing/${proyectoId}/vistas/${vistaId}`,
      { method: "PUT", body: JSON.stringify(datos) },
    ),
};
