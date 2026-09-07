import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, Clock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextoEnriquecido } from "@/components/editor/editor-texto";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/cliente";
import { useTema } from "@/lib/tema";
import { descuentoAplicable, precioConDescuento, diasHabitilesConExtra } from "@/lib/cms";
import type { Paquete } from "@/lib/api/tipos";

/** Texto de garantía por defecto (editable por el admin desde el panel). */
function garantiaPorDefecto(meses: number): string {
  return [
    '<h3>Documentación del flujo principal</h3>',
    '<p>Recibes la <strong>documentación completa del flujo principal</strong> de tu aplicación: qué pasa desde que un cliente te contacta hasta que cierras el servicio. Sin tecnicismos: pasos claros y diagramas simples que cualquier persona del equipo entiende a la primera.</p>',
    '<h3>Manual de uso</h3>',
    '<p>Incluye un <strong>manual de uso paso a paso</strong> para operar tu web o panel: publicar contenido, gestionar reservas, revisar clientes y consultar tus métricas, todo explicado en lenguaje sencillo.</p>',
    '<h3>Capacitación para tu equipo</h3>',
    '<p>Agendamos <strong>2 sesiones de clases en línea</strong> para que tus empleados aprendan a usarlo con confianza: trabajamos con casos reales de tu negocio, resolvemos dudas y dejamos al equipo listo para operar sin depender de nosotros.</p>',
    '<h3>Soporte técnico incluido</h3>',
    `<p>Además, cuentas con <strong>${meses} meses</strong> de soporte técnico: correcciones sin costo dentro de la garantía y acompañamiento cercano cuando lo necesites.</p>`,
    '<h3>Informe de pruebas</h3>',
    '<p>Al entregar, recibes el <strong>informe de pruebas bajo estándares de calidad</strong> (ISO/IEC 25000): funcionalidad, seguridad, usabilidad y rendimiento verificados, con los hallazgos documentados y el estado final de cada componente.</p>',
  ].join("");
}

const ETIQUETA_TIPO: Record<Paquete["tipo"], string> = {
  validor: "Validor",
  corporativo: "Corporativo",
  operativo: "Operativo",
};

/** Detalle de paquete: propuesta visual, no catálogo — lo construimos desde cero. */
export function DetalleProducto() {
  const { slug } = useParams<{ slug: string }>();
  const [paquete, setPaquete] = useState<Paquete | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { cms } = useTema();

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
        <Skeleton className="h-64 w-full" />
        <Skeleton className="mt-6 h-8 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  const hayDescuento = descuentoAplicable(cms);
  const precioFinal = hayDescuento
    ? precioConDescuento(paquete.precio, cms.descuento.porcentaje)
    : paquete.precio;
  const diasEntrega = diasHabitilesConExtra(paquete.diasEntrega, cms.diasExtra);
  const detallesExtra = paquete.detalles.filter((d) => d.titulo !== "¿Qué incluye?");

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

      {/* Hero: la propuesta, no el producto terminado */}
      <div className="relative min-h-[480px] overflow-hidden rounded-3xl border bg-[var(--brand-primario)] md:min-h-0 md:aspect-[21/9]">
        {paquete.imagen ? (
          <img
            src={paquete.imagen.url}
            alt={`Propuesta de ${paquete.nombre}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primario)] to-[#28405f]" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primario)] via-[var(--brand-primario)]/45 to-transparent"
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col justify-end gap-4 p-6 sm:p-8 md:flex-row md:items-end md:justify-between">
          <header className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-acento)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primario)]">
              <Layers className="size-3.5" />
              Paquete · {ETIQUETA_TIPO[paquete.tipo]}
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              {paquete.nombre}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              Lo construimos desde cero, a tu medida: alcance cerrado con hasta{" "}
              {paquete.vistasIncluidas}{" "}
              {paquete.vistasIncluidas === 1 ? "vista" : "vistas"} y{" "}
              {paquete.soporteMeses} meses de soporte.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-white/90">
                <Clock className="size-3.5" /> Entrega en {diasEntrega} días hábiles
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-white/90">
                Hasta {paquete.vistasIncluidas} {paquete.vistasIncluidas === 1 ? "vista" : "vistas"}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-white/90">
                {paquete.soporteMeses} meses de soporte
              </span>
            </div>
          </header>
          <div className="shrink-0 rounded-2xl bg-white/95 p-5 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-medium text-muted-foreground">
              {hayDescuento ? "Oferta de la semana" : "Desde"}
            </p>
            <p className="text-3xl font-bold text-[var(--brand-primario)]">
              ${precioFinal.toLocaleString("es-CO")}
              {hayDescuento && (
                <span className="ml-2 text-sm font-normal text-muted-foreground line-through opacity-60">
                  ${paquete.precio.toLocaleString("es-CO")}
                </span>
              )}
              <span className="text-base font-normal text-muted-foreground"> USD</span>
            </p>
            <Button asChild variant="accent" className="mt-3 w-full" size="lg">
              <Link to={`/productos/${paquete.slug}/comprar`}>
                Comprar ahora
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Descripción + resumen */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="text-lg font-semibold">¿Qué incluye este paquete?</h2>
          <TextoEnriquecido
            html={paquete.descripcion}
            className="mt-3 text-muted-foreground [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[var(--brand-primario)] [&_p]:mt-2 [&_p]:first:mt-0"
          />

          {paquete.features.length > 0 && (
            <>
              <h2 className="mt-10 text-lg font-semibold">Incluido en este paquete</h2>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {paquete.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 rounded-lg border p-3 text-sm"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--brand-acento)]" />
                    {f}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-10 rounded-xl border p-6">
            <h2 className="text-lg font-semibold">Garantía</h2>
            <TextoEnriquecido
              html={paquete.garantia || garantiaPorDefecto(paquete.soporteMeses)}
              className="mt-3 text-muted-foreground [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[var(--brand-primario)] [&_p]:mt-2 [&_p]:first:mt-0"
            />
          </div>

          {/* Otros detalles puntuales del paquete (si el admin los definió) */}
          {detallesExtra.length > 0 && (
            <section className="mt-10 space-y-6">
              {detallesExtra.map((d) => (
                <article key={d.titulo} className="rounded-xl border p-6">
                  <h3 className="text-lg font-semibold">{d.titulo}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{d.texto}</p>
                </article>
              ))}
            </section>
          )}
        </div>

        <aside className="h-fit space-y-5 lg:sticky lg:top-24">
          <div className="rounded-xl border bg-muted/40 p-5">
            <h2 className="font-bold">Lo que tienes con esta compra</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Entrega</dt>
                <dd className="font-medium">{diasEntrega} días hábiles</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Vistas</dt>
                <dd className="font-medium">{paquete.vistasIncluidas}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Soporte</dt>
                <dd className="font-medium">{paquete.soporteMeses} meses</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Funcionalidades extra</dt>
                <dd className="font-medium">a tu medida</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-xl border p-5">
            <p className="text-sm text-muted-foreground">
              Puedes sumar funcionalidades en el siguiente paso (cada una incluye
              su propia vista).
            </p>
            <Button asChild variant="accent" className="mt-3 w-full">
              <Link to={`/productos/${paquete.slug}/comprar`}>
                Personalizar y comprar
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
