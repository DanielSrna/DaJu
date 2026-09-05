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
      "Landings, webs corporativas y mini-dashboards hechos a la medida, con soporte con garantía. Tu negocio merece una web que trabaje por ti.",
  },
  "/productos": {
    titulo: "Productos — DaJu | Paquetes, plantillas y consultoría",
    descripcion:
      "Paquetes de alcance cerrado, plantillas listas para desplegar y consultoría técnica. Precios claros y soporte incluido.",
  },
  "/faq": {
    titulo: "Preguntas frecuentes — DaJu",
    descripcion:
      "Las dudas más comunes antes de empezar un proyecto: garantías, tiempos de entrega, soporte y costos.",
  },
  "/blog": {
    titulo: "Blog — DaJu | Conceptos para crecer",
    descripcion:
      "Conceptos clave explicados sin tecnicismos para negocios que están empezando o buscando la solución correcta.",
  },
  "/contacto": {
    titulo: "Contacto — DaJu",
    descripcion: "Cuéntanos tu idea y te ayudamos a convertirla en una web lista para crecer.",
  },
  "/postventa": {
    titulo: "Servicios post-venta — DaJu",
    descripcion:
      "Briefing guiado, seguimiento por etapas, fecha de entrega fija y soporte con garantía después de la compra.",
  },
};

export function metaDeRuta(pathname: string): MetaPagina {
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
