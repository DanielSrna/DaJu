/**
 * Meta tags (SEO / Open Graph) por ruta.
 * Actualiza <title>, description, og:* y canonical en cada navegación.
 */

export interface MetaPagina {
  titulo: string;
  descripcion: string;
}

function asegurarMeta(name: string, contenido: string, atributo: "name" | "property"): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${atributo}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(atributo, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", contenido);
}

export function aplicarMeta(url: string, pagina: MetaPagina): void {
  document.title = pagina.titulo;

  const brand = "DaJu — Agencia web";
  asegurarMeta("description", pagina.descripcion, "name");
  asegurarMeta("og:title", pagina.titulo, "property");
  asegurarMeta("og:description", pagina.descripcion, "property");
  asegurarMeta("og:type", "website", "property");
  asegurarMeta("og:url", url, "property");
  asegurarMeta("og:site_name", brand, "property");
  asegurarMeta("twitter:card", "summary", "name");
  asegurarMeta("twitter:title", pagina.titulo, "name");
  asegurarMeta("twitter:description", pagina.descripcion, "name");

  let canonico = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonico) {
    canonico = document.createElement("link");
    canonico.setAttribute("rel", "canonical");
    document.head.appendChild(canonico);
  }
  canonico.setAttribute("href", url);
}

const DESCRIPCION_BASE =
  "DaJu es un equipo de ingenieros de sistemas que construye landings, webs corporativas y mini-dashboards a la medida, con soporte y garantía.";

const METAS_EXACTAS: Record<string, MetaPagina> = {
  "/": {
    titulo: "DaJu — Agencia web | Webs que venden",
    descripcion:
      "Landings, webs corporativas y mini-dashboards a la medida, con soporte con garantía. Cuéntanos tu idea y recibe tu web lista en semanas.",
  },
  "/productos": {
    titulo: "Paquetes, plantillas y consultoría — DaJu",
    descripcion:
      "Paquetes de alcance cerrado, plantillas listas para desplegar y consultoría por sesiones. Precios claros, soporte con garantía y entrega fija.",
  },
  "/faq": {
    titulo: "Preguntas frecuentes — DaJu",
    descripcion:
      "Resolvemos tus dudas sobre precios, tiempos de entrega, garantía y soporte antes de que empieces tu proyecto.",
  },
  "/blog": {
    titulo: "Blog — DaJu | Conceptos sin tecnicismos",
    descripcion:
      "Conceptos y noticias para negocios que quieren crecer: aprende qué web necesitas y qué se hace en cada etapa.",
  },
  "/contacto": {
    titulo: "Contacto — DaJu | Cuéntanos tu idea",
    descripcion:
      "Conversemos: te ayudamos a convertir tu idea en una web lista para crecer, sin presión y con precios claros.",
  },
  "/postventa": {
    titulo: "Postventa — DaJu | Briefing y garantía",
    descripcion:
      "El viaje después de comprar: briefing guiado, seguimiento por etapas, fecha de entrega fija y soporte con garantía.",
  },
  "/terminos": {
    titulo: "Términos y condiciones — DaJu",
    descripcion:
      "Condiciones de compra, postventa y garantía de ajuste de los servicios de DaJu.",
  },
  "/privacidad": {
    titulo: "Política de privacidad — DaJu",
    descripcion:
      "Qué datos tratamos, para qué los usamos y los derechos que tienes como cliente.",
  },
};

/** Prefijo de clave por ruta (para SEO editable desde el CMS). */
const PREFIJOS_META: Record<string, string> = {
  "/": "meta.inicio",
  "/productos": "meta.productos",
  "/blog": "meta.blog",
  "/faq": "meta.faq",
  "/contacto": "meta.contacto",
  "/postventa": "meta.postventa",
};

/**
 * Meta de una ruta, usando el texto del CMS si el admin lo personalizó
 * (claves `meta.<pagina>.titulo` / `meta.<pagina>.descripcion`), con el
 * fallback estático de la vitrina.
 */
export function metaDeRuta(pathname: string, textos?: Record<string, string>): MetaPagina {
  const base = metaBase(pathname);
  const prefijo = PREFIJOS_META[pathname];
  if (prefijo && textos) {
    const titulo = textos[`${prefijo}.titulo`]?.trim();
    const descripcion = textos[`${prefijo}.descripcion`]?.trim();
    if (titulo) return { titulo, descripcion: descripcion || base.descripcion };
    if (descripcion) return { titulo: base.titulo, descripcion };
  }
  return base;
}

function metaBase(pathname: string): MetaPagina {
  const exacta = METAS_EXACTAS[pathname];
  if (exacta) return exacta;

  if (pathname.startsWith("/productos/")) {
    if (pathname.endsWith("/comprar")) {
      return {
        titulo: "Finalizar compra — DaJu",
        descripcion: "Personaliza tu proyecto y finaliza tu compra de forma segura.",
      };
    }
    return {
      titulo: "Detalle del producto — DaJu",
      descripcion: "Alcance, tiempos, soporte y precio de este producto DaJu.",
    };
  }

  if (pathname.startsWith("/plantillas/")) {
    if (pathname.endsWith("/comprar")) {
      return {
        titulo: "Finalizar compra — DaJu",
        descripcion: "Adapta la plantilla con funciones extras y finaliza tu compra.",
      };
    }
    return {
      titulo: "Plantilla — DaJu | Soluciones listas para desplegar",
      descripcion: "Vistas, funciones incluidas, precio y soporte de esta plantilla DaJu.",
    };
  }

  if (pathname.startsWith("/servicios/")) {
    if (pathname.endsWith("/comprar")) {
      return {
        titulo: "Reservar sesión — DaJu",
        descripcion: "Compra sesiones de consultoría con un ingeniero senior.",
      };
    }
    return {
      titulo: "Consultoría — DaJu | Sesiones de alto nivel",
      descripcion: "Qué se trabaja, cómo se agenda y precio de esta sesión DaJu.",
    };
  }

  if (pathname.startsWith("/blog/")) {
    return {
      titulo: "Artículo — DaJu Blog",
      descripcion: DESCRIPCION_BASE,
    };
  }

  if (pathname.startsWith("/cliente") || pathname.startsWith("/admin")) {
    return {
      titulo: "Portal DaJu",
      descripcion: "Accede a tu proyecto, briefing, garantía y soporte DaJu.",
    };
  }

  return {
    titulo: "Página no encontrada — DaJu",
    descripcion: DESCRIPCION_BASE,
  };
}
