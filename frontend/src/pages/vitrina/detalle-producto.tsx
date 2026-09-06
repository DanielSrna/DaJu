import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/cliente";
import type { Paquete } from "@/lib/api/tipos";
import { PlaceholderImagen } from "./productos";

export function DetalleProducto() {
  const { slug } = useParams<{ slug: string }>();
  const [paquete, setPaquete] = useState<Paquete | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .paquetePorSlug(slug)
      .then((r) => setPaquete(r.paquete))
      .catch(() => setError("No encontramos este producto."));
  }, [slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">{error}</p>
        <Button className="mt-4" onClick={() => (window.location.href = "/productos")}>
          Volver a productos
        </Button>
      </div>
    );
  }

  if (!paquete) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-14">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="mt-6 h-8 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  const vistas = [paquete.imagen, ...paquete.galeria].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => (window.location.href = "/productos")}
      >
        ← Volver a productos
      </Button>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Galería: placeholder elegante mientras el admin sube imágenes reales */}
        <div className="space-y-4">
          {vistas.length > 0 ? (
            <>
              <img
                src={vistas[0]!.url}
                alt={paquete.nombre}
                className="aspect-[3/2] w-full rounded-xl object-cover"
              />
              <div className="grid grid-cols-4 gap-3">
                {vistas.slice(1).map((v) => (
                  <img
                    key={v!.publicId}
                    src={v!.url}
                    alt={`Vista de ${paquete.nombre}`}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            </>
          ) : (
            <PlaceholderImagen
              etiqueta="Portada del producto"
              dimensiones="1200 × 800 · Se sube desde el panel admin"
              className="aspect-[3/2]"
            />
          )}
        </div>

        {/* Información */}
        <div>
          <h1 className="text-3xl font-bold">{paquete.nombre}</h1>
          <p className="mt-3 text-muted-foreground">{paquete.descripcion}</p>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
              <Clock className="size-3.5" /> Entrega en {paquete.diasEntrega} días hábiles
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              Hasta {paquete.vistasIncluidas} {paquete.vistasIncluidas === 1 ? "vista" : "vistas"}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              {paquete.soporteMeses} meses de soporte
            </span>
          </div>

          <ul className="mt-6 space-y-2">
            {paquete.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--brand-acento)]" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl border bg-muted/40 p-5">
            <p className="text-sm text-muted-foreground">Desde</p>
            <p className="text-3xl font-bold">
              ${paquete.precio.toLocaleString("es-CO")}{" "}
              <span className="text-base font-normal text-muted-foreground">USD</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Puedes sumar funcionalidades extra en el siguiente paso.
            </p>
            <Button
              className="mt-4 w-full"
              variant="accent"
              size="lg"
              onClick={() =>
                (window.location.href = `/productos/${paquete.slug}/comprar`)
              }
            >
              Comprar ahora
            </Button>
          </div>
        </div>
      </div>

      {/* Secciones descriptivas del producto */}
      {paquete.detalles.length > 0 && (
        <section className="mt-16 grid gap-6 md:grid-cols-2">
          {paquete.detalles.map((d) => (
            <article key={d.titulo} className="rounded-xl border p-6">
              <h2 className="text-lg font-semibold">{d.titulo}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{d.texto}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
