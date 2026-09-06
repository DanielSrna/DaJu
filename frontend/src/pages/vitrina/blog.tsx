import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/cliente";
import type { Publicacion } from "@/lib/api/tipos";

export function Blog() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .publicaciones()
      .then((r) => setPublicaciones(r.publicaciones))
      .catch(() => setError("No pudimos cargar las publicaciones."));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="text-3xl font-bold">Blog</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Noticias y conceptos clave explicados sin tecnicismos, para negocios que
        están empezando o buscando la solución correcta.
      </p>

      {!publicaciones ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-xl border p-6">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : publicaciones.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          Todavía no hay publicaciones. Vuelve pronto.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {publicaciones.map((pub) => {
            const Icono = pub.tipo === "noticia" ? Newspaper : BookOpen;
            return (
              <article
                key={pub.id}
                className="group flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  <Icono className="size-3.5" />
                  {pub.tipo === "noticia" ? "Noticia" : "Concepto"}
                </p>
                <h2 className="mt-3 text-lg font-bold group-hover:text-[var(--brand-primario)]">
                  {pub.titulo}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {pub.resumen}
                </p>
                <div className="mt-auto pt-4">
                  <Link
                    to={`/blog/${pub.slug}`}
                    className="text-sm font-semibold text-[var(--brand-primario)] underline-offset-4 group-hover:underline"
                  >
                    Leer más →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
