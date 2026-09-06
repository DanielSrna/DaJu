import type {
  CmsPublico,
  CmsEditorRespuesta,
  Paquete,
  PaqueteInput,
  Oferta,
  OfertaInput,
  FuncionalidadExtra,
  CheckoutResultado,
  ContactoMensaje,
  Publicacion,
  PublicacionInput,
  ApiError,
} from "./tipos";

const BASE = "/api/v1";

async function peticion<T>(url: string, opciones?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: "include",
    headers: opciones?.body ? { "Content-Type": "application/json" } : undefined,
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
    paqueteId: string;
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
};
