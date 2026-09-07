import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Blocks, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextoEnriquecido } from "@/components/editor/editor-texto";
import { Skeleton } from "@/components/ui/skeleton";
import { GaleriaProducto } from "@/components/vitrina/galeria-producto";
import { api } from "@/lib/api/cliente";
import { useTema } from "@/lib/tema";
import { descuentoAplicable, precioConDescuento, diasHabitilesConExtra } from "@/lib/cms";
import type { Plantilla } from "@/lib/api/tipos";
import { PlaceholderImagen } from "./productos";

/** Detalle de plantilla: catálogo visual — se ven las vistas antes de comprar. */
export function DetallePlantilla() {
  const { slug } = useParams<{ slug: string }>();
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { cms } = useTema();

  useEffect(() => {
    if (!slug) return;
    api
      .plantillaPorSlug(slug)
      .then((r) => setPlantilla(r.plantilla))
      .catch(() => setError("No encontramos esta plantilla."));
  }, [slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">{error}</p>
        <Button className="mt-4" onClick={() => (window.location.href = "/productos#plantillas")}>
          Volver a productos
        </Button>
      </div>
    );
  }

  if (!plantilla) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-14">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="mt-6 h-8 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  const vistas = [plantilla.imagen, ...plantilla.galeria].filter(
    (v): v is { url: string; publicId: string } => Boolean(v),
  );
  const hayDescuento = descuentoAplicable(cms);
  const precioFinal = hayDescuento
    ? precioConDescuento(plantilla.precio, cms.descuento.porcentaje)
    : plantilla.precio;
  const diasEntrega = diasHabitilesConExtra(plantilla.diasEntrega, cms.diasExtra);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => (window.location.href = "/productos#plantillas")}
      >
        ← Volver a productos
      </Button>

      <div className="grid items-start gap-10 lg:grid-cols-2">
        {/* Galería de vistas de la plantilla */}
        <div>
          {vistas.length > 0 ? (
            <GaleriaProducto vistas={vistas} nombre={plantilla.nombre} />
          ) : (
            <PlaceholderImagen
              etiqueta="Captura de la plantilla"
              dimensiones="1200 × 800 · Se sube desde el panel admin"
              className="aspect-[3/2] rounded-xl"
            />
          )}
        </div>

        {/* Información */}
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-acento)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primario)]">
            <Blocks className="size-3.5" />
            Plantilla · {plantilla.plataforma}
          </p>
          <h1 className="mt-3 text-3xl font-bold">{plantilla.nombre}</h1>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
              <Clock className="size-3.5" /> Entrega en {diasEntrega} días hábiles
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              {plantilla.vistasIncluidas} {plantilla.vistasIncluidas === 1 ? "vista" : "vistas"}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              {plantilla.soporteMeses} meses de soporte
            </span>
            <span className="rounded-full bg-muted px-3 py-1">Nube a tu cuenta</span>
          </div>

          <ul className="mt-6 space-y-2">
            {plantilla.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--brand-acento)]" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl border bg-muted/40 p-5 lg:mt-6">
            <p className="text-sm text-muted-foreground">
              {hayDescuento ? "Oferta de la semana" : "Desde"}
            </p>
            <p className="text-3xl font-bold">
              ${precioFinal.toLocaleString("es-CO")}
              {hayDescuento && (
                <span className="ml-2 text-sm font-normal text-muted-foreground line-through opacity-60">
                  ${plantilla.precio.toLocaleString("es-CO")}
                </span>
              )}
              <span className="text-base font-normal text-muted-foreground"> USD</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Puedes sumar funcionalidades en el siguiente paso.
            </p>
            <Button
              asChild
              variant="accent"
              size="lg"
              className="mt-4 w-full"
            >
              <Link to={`/plantillas/${plantilla.slug}/comprar`}>
                Comprar ahora
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Descripción y secciones de la plantilla */}
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="rounded-xl border p-6">
          <h2 className="text-lg font-semibold">¿Qué incluye esta plantilla?</h2>
          <TextoEnriquecido
            html={plantilla.descripcion}
            className="mt-3 text-muted-foreground [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[var(--brand-primario)] [&_p]:mt-2 [&_p]:first:mt-0"
          />
        </div>

        {plantilla.detalles.length > 0 && (
          <div className="rounded-xl border p-6">
            <h2 className="text-lg font-semibold">Detalles</h2>
            <div className="mt-3 space-y-4">
              {plantilla.detalles.map((d) => (
                <article key={d.titulo}>
                  <h3 className="font-semibold">{d.titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{d.texto}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
