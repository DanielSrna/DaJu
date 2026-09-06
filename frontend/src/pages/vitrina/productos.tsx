import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Blocks,
  Check,
  Clock,
  Code2,
  HelpCircle,
  ImageIcon,
  Layers,
  Tag,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/cliente";
import { useTema } from "@/lib/tema";
import { precioConDescuento, diasHabitilesConExtra, descuentoAplicable, recomendacionesDePaquetes } from "@/lib/cms";
import type { Paquete, Oferta } from "@/lib/api/tipos";

/**
 * Placeholder visual para paquetes sin imagen:
 * indica las dimensiones esperadas de la portada para guiar al admin.
 */
export function PlaceholderImagen({
  etiqueta,
  dimensiones = "1200 × 800",
  className = "aspect-[3/2]",
}: {
  etiqueta: string;
  dimensiones?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/40 bg-muted text-muted-foreground ${className}`}
    >
      <ImageIcon className="size-8 opacity-50" />
      <span className="text-sm font-medium">{etiqueta}</span>
      <span className="text-xs opacity-60">Portada sugerida: {dimensiones}</span>
    </div>
  );
}

const DESCRIPCION_TIPO: Record<Paquete["tipo"], string> = {
  validor: "Para arrancar rápido",
  corporativo: "Para crecer con presencia",
  operativo: "Para digitalizar tu operación",
};

/** Filas de la comparativa (se renderizan con los datos reales del paquete). */
const FILAS_COMPARATIVA = [
  {
    etiqueta: "Ideal para",
    valor: (p: Paquete) => DESCRIPCION_TIPO[p.tipo],
  },
  {
    etiqueta: "Vistas incluidas",
    valor: (p: Paquete) => `${p.vistasIncluidas}`,
  },
  {
    etiqueta: "Soporte con garantía",
    valor: (p: Paquete) => `${p.soporteMeses} meses`,
  },
  {
    etiqueta: "Tiempo de entrega",
    valor: (p: Paquete) => `${p.diasEntrega} días hábiles`,
  },
  {
    etiqueta: "Precio",
    valor: (p: Paquete) => `$${p.precio.toLocaleString("es-CO")}`,
    destacado: true,
  },
];

export function Productos() {
  const [paquetes, setPaquetes] = useState<Paquete[] | null>(null);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { cms } = useTema();

  const hayDescuento = descuentoAplicable(cms);
  const diasMostrar = (base: number): number => diasHabitilesConExtra(base, cms.diasExtra);

  const cargar = (): void => {
    setPaquetes(null);
    setError(null);
    Promise.all([api.paquetes(), api.ofertas()])
      .then(([p, o]) => {
        setPaquetes(p.paquetes);
        setOfertas(o.ofertas);
      })
      .catch(() => setError("No pudimos cargar los productos. Intenta de nuevo."));
  };

  useEffect(() => {
    cargar();
  }, []);

  const plantillas = ofertas.filter((o) => o.tipo === "plantilla");
  const servicios = ofertas.filter((o) => o.tipo === "consultoria");
  const recomendaciones = paquetes ? recomendacionesDePaquetes(paquetes) : [];
  const hayContenido =
    (paquetes?.length ?? 0) > 0 || plantillas.length > 0 || servicios.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="text-3xl font-bold">Productos</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Tres formas de trabajar con nosotros: paquetes de alcance cerrado,
        plantillas listas para desplegar y consultoría por sesiones.
      </p>

      {/* Accesos rápidos a cada familia */}
      <nav
        aria-label="Familias de productos"
        className="mt-6 flex flex-wrap gap-2"
      >
        {[
          ["#paquetes", "Paquetes"],
          ["#plantillas", "Plantillas"],
          ["#consultoria", "Consultoría"],
        ].map(([href, etiqueta]) => (
          <a
            key={href}
            href={href}
            className="rounded-full border px-4 py-1.5 text-sm font-medium text-[var(--brand-primario)] hover:bg-muted"
          >
            {etiqueta}
          </a>
        ))}
      </nav>

      <section id="paquetes" className="mt-12 scroll-mt-24">
        <h2 className="text-2xl font-bold">Paquetes</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Alcances cerrados con soporte incluido. Haz clic en un producto para
          verlo en detalle y sumarle funcionalidades a tu medida.
        </p>

        {error ? (
          <div className="mt-8 rounded-xl border bg-muted/50 p-8 text-center">
            <p className="text-lg font-semibold">{error}</p>
            <Button className="mt-4" onClick={cargar}>
              Reintentar
            </Button>
          </div>
        ) : !paquetes ? (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-4 rounded-xl border p-6">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {paquetes.map((paquete) => (
                <article
                  key={paquete.id}
                  className="flex flex-col rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-lg"
                >
                  {paquete.imagen ? (
                    <img
                      src={paquete.imagen.url}
                      alt={paquete.nombre}
                      className="aspect-[3/2] w-full rounded-t-xl object-cover"
                    />
                  ) : (
                    <div className="p-4 pb-0">
                      <PlaceholderImagen
                        etiqueta={`Imagen de ${paquete.nombre}`}
                        dimensiones="1200 × 800"
                      />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-6">
                    <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--brand-primario)]/[0.08] px-2.5 py-1 text-xs font-semibold text-[var(--brand-primario)]">
                      <Layers className="size-3.5 text-[var(--brand-acento)]" />
                      {DESCRIPCION_TIPO[paquete.tipo]}
                    </p>
                    <h3 className="mt-4 text-xl font-bold">{paquete.nombre}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {paquete.descripcion}
                    </p>

                    <ul className="mt-5 space-y-2.5">
                      {paquete.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm leading-relaxed">
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--brand-acento)]/20">
                            <Check className="size-2.5 text-[var(--brand-primario)]" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-6">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="relative">
                          {hayDescuento && (
                            <span className="absolute -top-3 left-0 inline-block rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              -{cms.descuento.porcentaje}%
                            </span>
                          )}
                          <span className="text-2xl font-bold text-[var(--brand-primario)]">
                            ${precioConDescuento(paquete.precio, cms.descuento.porcentaje).toLocaleString("es-CO")}
                          </span>
                          {hayDescuento && (
                            <span className="ml-1.5 text-sm text-muted-foreground line-through opacity-55">
                              ${paquete.precio.toLocaleString("es-CO")}
                            </span>
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Clock className="size-3" />
                          {diasMostrar(paquete.diasEntrega)} días hábiles
                        </span>
                      </div>
                      <Button asChild className="mt-4 w-full" variant="accent">
                        <Link to={`/productos/${paquete.slug}`}>
                          Ver detalle
                          <ArrowRight />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/*
        Plantillas: soluciones web listas para desplegar (datos del CMS).
        El cliente asume los costos de nube y puede sumar funciones.
      */}
      <section id="plantillas" className="mt-16 scroll-mt-24">
        <h2 className="text-2xl font-bold">Plantillas listas para desplegar</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Soluciones web probadas que desplegamos para ti en días: tú asumes el
          costo de la nube (dominio y hosting) y nosotros lo dejamos funcionando.
          Puedes sumar funciones por costo adicional.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {plantillas.map((o) => (
            <article
              key={o.id}
              className="flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
                <Blocks className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{o.nombre}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{o.descripcion}</p>
              <ul className="mt-4 space-y-2">
                {o.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--brand-acento)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-5">
                <p className="relative inline-flex items-baseline gap-1.5 rounded-full border border-[var(--brand-acento)]/40 bg-[var(--brand-acento)]/10 px-3 py-1">
                  {hayDescuento && (
                    <span className="absolute -top-3.5 left-0 inline-block rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      -{cms.descuento.porcentaje}%
                    </span>
                  )}
                  Desde{" "}
                  <span className="text-lg font-bold text-[var(--brand-primario)]">
                    ${precioConDescuento(o.desde ?? 0, cms.descuento.porcentaje).toLocaleString("es-CO")}
                  </span>
                  {hayDescuento && (
                    <span className="ml-0.5 text-xs text-muted-foreground line-through opacity-55">
                      ${(o.desde ?? 0).toLocaleString("es-CO")}
                    </span>
                  )}
                  <span className="text-xs font-medium text-muted-foreground">
                    + nube
                  </span>
                </p>
                <Button asChild variant="outline" className="mt-3 w-full">
                  <Link to="/contacto">
                    Solicitar esta plantilla
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/*
        Consultoría: sesiones de alto nivel, agendadas por Meet/Zoom.
      */}
      <section id="consultoria" className="mt-16 scroll-mt-24">
        <h2 className="text-2xl font-bold">Consultoría por sesiones</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Nuestro lado más técnico: sesiones de alto nivel donde un ingeniero
          revisa, acelera o asesora tu proyecto. Se agendan por Meet o Zoom y el
          precio depende del alcance de cada sesión.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {servicios.map((o) => (
            <article
              key={o.id}
              className="flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
                <Code2 className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{o.nombre}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{o.descripcion}</p>
              {o.para && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primario)]/10 bg-[var(--brand-primario)]/[0.04] px-3 py-2 text-xs text-muted-foreground">
                  <Code2 className="size-3.5 shrink-0 text-[var(--brand-acento)]" />
                  {o.para}
                </p>
              )}
              {hayDescuento && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-600/10 px-2.5 py-1 text-xs font-semibold text-red-700">
                  <Tag className="size-3" />
                  -{cms.descuento.porcentaje}% en sesiones durante la promo
                </p>
              )}
              <div className="mt-auto pt-5">
                <Button asChild className="w-full" variant="accent">
                  <Link to="/contacto">
                    Agendar una sesión
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/*
        ¿No sabes qué elegir?: comparativa y recomendaciones en un
        desplegable, para quien aún duda entre ofertas. Se adapta a los
        paquetes/plantillas/servicios que existan (omitida si no hay nada).
      */}
      {hayContenido && (
        <section id="no-sabes-que-elegir" className="mt-16 scroll-mt-24">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[var(--brand-primario)]/[0.06] via-transparent to-[var(--brand-acento)]/[0.08]">
          {/* Barra de acento superior */}
          <div className="h-2 w-full bg-gradient-to-r from-[var(--brand-primario)] via-[var(--brand-acento)] to-[var(--brand-primario)]" />

          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primario)] text-[var(--brand-acento)] shadow-sm">
                <HelpCircle className="size-6" />
              </div>
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-acento)]/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-primario)]">
                  <span className="size-1.5 rounded-full bg-[var(--brand-acento)]" />
                  ¿Dudas entre paquetes?
                </p>
                <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                  ¿No sabes qué elegir?
                </h2>
                <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
                  Sin presión: abre la comparativa, lee la recomendación según tu
                  momento y, si nada te encaja, escríbenos y lo negociamos.
                </p>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border bg-background shadow-sm">
              <Accordion type="single" collapsible>
                <AccordionItem
                  value="comparativa"
                  className="border-b last:border-0"
                >
                  <AccordionTrigger className="data-[state=open]:bg-[var(--brand-primario)] data-[state=open]:text-white hover:bg-[var(--brand-acento)]/10 hover:text-[var(--brand-primario)] data-[state=open]:hover:bg-[var(--brand-primario)] data-[state=open]:hover:text-white">
                    Comparativa: los tres paquetes lado a lado
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-5 sm:px-6">
                    {paquetes ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="p-4 font-bold">Característica</th>
                              {paquetes.map((p) => (
                                <th key={p.id} className="p-4 font-bold">
                                  {p.nombre}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {FILAS_COMPARATIVA.map((fila) => (
                              <tr
                                key={fila.etiqueta}
                                className="border-b last:border-0 odd:bg-muted/40"
                              >
                                <th
                                  scope="row"
                                  className="p-4 align-middle font-medium text-muted-foreground"
                                >
                                  {fila.etiqueta}
                                </th>
                                {paquetes.map((p) => (
                                  <td
                                    key={p.id}
                                    className={`p-4 align-middle ${fila.destacado ? "font-bold text-[var(--brand-primario)]" : ""}`}
                                  >
                                    {fila.valor(p)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {hayDescuento && (
                              <tr className="border-b last:border-0 odd:bg-muted/40">
                                <th
                                  scope="row"
                                  className="p-4 align-middle font-medium text-muted-foreground"
                                >
                                  Precio con descuento
                                </th>
                                {paquetes.map((p) => (
                                  <td key={p.id} className="p-4 align-middle font-bold text-[var(--brand-primario)]">
                                    ${precioConDescuento(p.precio, cms.descuento.porcentaje).toLocaleString("es-CO")}
                                    <span className="ml-1.5 text-xs font-normal text-muted-foreground line-through opacity-55">
                                      ${p.precio.toLocaleString("es-CO")}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="py-2 text-sm text-muted-foreground">
                        {error
                          ? "La comparativa estará disponible cuando los paquetes se carguen. Intenta recargar la página."
                          : "Cargando los paquetes…"}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {recomendaciones.map((rec) => (
                  <AccordionItem
                    key={rec.paqueteId}
                    value={`recomendacion-${rec.paqueteId}`}
                    className="border-b last:border-0"
                  >
                    <AccordionTrigger className="data-[state=open]:bg-[var(--brand-primario)] data-[state=open]:text-white hover:bg-[var(--brand-acento)]/10 hover:text-[var(--brand-primario)] data-[state=open]:hover:bg-[var(--brand-primario)] data-[state=open]:hover:text-white">
                      {rec.pregunta}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-5 sm:px-6">
                      <p className="leading-relaxed">{rec.texto}</p>
                      <p className="mt-3 text-sm text-muted-foreground">{rec.detalles}</p>
                      <div className="mt-4">
                        <Button asChild variant="outline">
                          <Link to={`/productos/${rec.slug}`}>
                            Ver este producto en detalle
                            <ArrowRight />
                          </Link>
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}

                {plantillas.length > 0 && (
                  <AccordionItem value="plantillas" className="border-b last:border-0">
                    <AccordionTrigger className="data-[state=open]:bg-[var(--brand-primario)] data-[state=open]:text-white hover:bg-[var(--brand-acento)]/10 hover:text-[var(--brand-primario)] data-[state=open]:hover:bg-[var(--brand-primario)] data-[state=open]:hover:text-white">
                      Plantillas listas para desplegar
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-5 sm:px-6">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {plantillas.map((o) => (
                          <div key={o.id} className="rounded-lg border p-3">
                            <p className="font-semibold">{o.nombre}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{o.descripcion}</p>
                            {o.desde != null && (
                              <p className="mt-2 text-sm font-bold text-[var(--brand-primario)]">
                                Desde ${precioConDescuento(o.desde, cms.descuento.porcentaje).toLocaleString("es-CO")}
                                {hayDescuento && (
                                  <span className="ml-1 text-xs font-normal text-muted-foreground line-through opacity-55">
                                    ${o.desde.toLocaleString("es-CO")}
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {servicios.length > 0 && (
                  <AccordionItem value="servicios" className="border-b last:border-0">
                    <AccordionTrigger className="data-[state=open]:bg-[var(--brand-primario)] data-[state=open]:text-white hover:bg-[var(--brand-acento)]/10 hover:text-[var(--brand-primario)] data-[state=open]:hover:bg-[var(--brand-primario)] data-[state=open]:hover:text-white">
                      Consultoría por sesiones
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-5 sm:px-6">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {servicios.map((o) => (
                          <div key={o.id} className="rounded-lg border p-3">
                            <p className="font-semibold">{o.nombre}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{o.descripcion}</p>
                            {o.para && <p className="mt-2 text-xs text-muted-foreground">{o.para}</p>}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                <AccordionItem value="negociar" className="border-b last:border-0">
                  <AccordionTrigger className="data-[state=open]:bg-[var(--brand-primario)] data-[state=open]:text-white hover:bg-[var(--brand-acento)]/10 hover:text-[var(--brand-primario)] data-[state=open]:hover:bg-[var(--brand-primario)] data-[state=open]:hover:text-white">
                    ¿Ninguno te encaja del todo?
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-5 sm:px-6">
                    <p className="leading-relaxed">
                      Es normal: tu caso puede combinar necesidades de varios
                      paquetes o ir por otro camino. Cuéntanos qué necesitas y te
                      proponemos un alcance y precio negociados, o compra el
                      paquete base y suma funcionalidades con costo según su
                      complejidad.
                    </p>
                    <div className="mt-5">
                      <Button asChild variant="accent">
                        <Link to="/contacto">
                          Contar mi caso para negociar
                          <ArrowRight />
                        </Link>
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
        </section>
      )}
    </div>
  );
}
