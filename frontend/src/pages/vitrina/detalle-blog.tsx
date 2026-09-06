import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/cliente";
import type { Publicacion } from "@/lib/api/tipos";

/** Convierte el texto (párrafos separados por línea en blanco) en bloques. */
function bloques(contenido: string): string[] {
  return contenido
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Heurística: los párrafos cortos que terminan en "?" o ":" son subtítulos. */
function esSubtitulo(parrafo: string): boolean {
  return (
    parrafo.length <= 60 &&
    (parrafo.endsWith("?") || parrafo.endsWith(":") || parrafo.endsWith("¿Qué es"))
  );
}

export function DetalleBlog() {
  const { slug } = useParams<{ slug: string }>();
  const [pub, setPub] = useState<Publicacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .publicacionPorSlug(slug)
      .then((r) => setPub(r.publicacion))
      .catch(() => setError("No encontramos esta publicación."));
  }, [slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">{error}</p>
        <Button className="mt-4" onClick={() => (window.location.href = "/blog")}>
          Volver al blog
        </Button>
      </div>
    );
  }

  if (!pub) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  const Icono = pub.tipo === "noticia" ? Newspaper : BookOpen;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => (window.location.href = "/blog")}
      >
        ← Volver al blog
      </Button>

      <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        <Icono className="size-3.5" />
        {pub.tipo === "noticia" ? "Noticia" : "Concepto"}
      </p>
      <h1 className="mt-4 text-3xl font-bold">{pub.titulo}</h1>

      <article className="mt-8 space-y-6 text-[17px] leading-relaxed text-foreground/90">
        {bloques(pub.contenido).map((parrafo, i) =>
          esSubtitulo(parrafo) ? (
            <h2 key={i} className="pt-2 text-xl font-bold text-[var(--brand-primario)]">
              {parrafo}
            </h2>
          ) : (
            <p key={i}>{parrafo}</p>
          ),
        )}
      </article>

      <div className="mt-12 rounded-xl bg-[var(--brand-primario)] p-6 text-center text-white">
        <p className="text-lg font-semibold">
          ¿Quieres esto para tu negocio?
        </p>
        <p className="mt-1 text-sm text-white/70">
          Hablemos sin compromiso sobre tu proyecto.
        </p>
        <Button asChild variant="accent" className="mt-4">
          <Link to="/contacto">Contáctanos</Link>
        </Button>
      </div>
    </div>
  );
}
