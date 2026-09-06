import { useEffect, useState } from "react";
import { api } from "@/lib/api/cliente";
import type { Publicacion } from "@/lib/api/tipos";

/**
 * Publicaciones del blog asociadas a una sección, indexadas por slug.
 * Permite enlazar palabras clave del texto de FAQ/post-venta hacia el blog
 * solo si la publicación existe y está publicada (sin enlaces rotos).
 */
export function usePublicacionesSeccion(seccion: string): Map<string, Publicacion> {
  const [porSlug, setPorSlug] = useState<Map<string, Publicacion>>(new Map());

  useEffect(() => {
    let activo = true;
    api
      .publicaciones({ seccion })
      .then((r) => {
        if (!activo) return;
        const mapa = new Map<string, Publicacion>();
        for (const pub of r.publicaciones) {
          mapa.set(pub.slug, pub);
        }
        setPorSlug(mapa);
      })
      .catch(() => {
        if (activo) setPorSlug(new Map());
      });
    return () => {
      activo = false;
    };
  }, [seccion]);

  return porSlug;
}
