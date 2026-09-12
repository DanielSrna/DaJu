import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, CalendarClock, Clock, MessageSquare, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CotizarModal } from "@/components/vitrina/cotizar-modal";
import { TextoEnriquecido } from "@/components/editor/editor-texto";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/cliente";
import type { CategoriaServicio, Servicio } from "@/lib/api/tipos";

const CATEGORIA_INFO: Record<
  CategoriaServicio,
  { etiqueta: string; texto: string }
> = {
  auditoria: {
    etiqueta: "Auditoría",
    texto: "Revisión a fondo de tu código y tu arquitectura, con informe accionable.",
  },
  asesoria: {
    etiqueta: "Asesoría",
    texto: "Tu bloqueo técnico en la mesa: decisiones de arquitectura, roadmap y segunda opinión senior.",
  },
  aceleracion: {
    etiqueta: "Aceleración",
    texto: "Diagnóstico del estado real y plan de acción para destrabar tu proyecto.",
  },
};

const PASOS = [
  { titulo: "Cotiza y crea tu cuenta", texto: "Regístrate con el servicio que te interesa y conversamos gratis qué necesitas." },
  { titulo: "Completa tu información", texto: "Sube los archivos y contexto que el equipo necesita para aprovechar la cita." },
  { titulo: "Agendamos la cita", texto: "Recibes el enlace de la videollamada (Meet o Zoom) y recordatorios antes de cada sesión." },
  { titulo: "Trabajo y seguimiento", texto: "En la sesión se resuelve lo concreto y al cerrar recibes un resumen de lo acordado." },
];

/** Detalle de servicio/consultoría: texto primero, sin mockups ni vitrina visual. */
export function DetalleServicio() {
  const { slug } = useParams<{ slug: string }>();
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cotizarAbierto, setCotizarAbierto] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api
      .servicioPorSlug(slug)
      .then((r) => setServicio(r.servicio))
      .catch(() => setError("No encontramos este servicio."));
  }, [slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">{error}</p>
        <Button className="mt-4" onClick={() => (window.location.href = "/productos#consultoria")}>
          Volver a productos
        </Button>
      </div>
    );
  }

  if (!servicio) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  const info = CATEGORIA_INFO[servicio.categoria] ?? CATEGORIA_INFO.asesoria;

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => (window.location.href = "/productos#consultoria")}>
        ← Volver a productos
      </Button>

      {/* Encabezado descriptivo */}
      <header className="relative overflow-hidden rounded-3xl bg-[var(--brand-primario)] p-8 sm:p-10">
        <div
          className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-[var(--brand-acento)]/20"
          aria-hidden="true"
        />
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-acento)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primario)]">
          Consultoría · {info.etiqueta}
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          {servicio.nombre}
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-white/80">{info.texto}</p>

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-white">
            <Clock className="size-3.5" /> {servicio.duracionMin} min
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-white">
            <Video className="size-3.5" /> Por {servicio.canal}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-white">
            <BadgeCheck className="size-3.5" /> Garantía de calidad
          </span>
        </div>
      </header>

      {/* Descripción principal — texto largo y descriptivo */}
      <section className="mt-10">
        <h2 className="text-xl font-bold">En qué consiste</h2>
        <TextoEnriquecido
          html={servicio.descripcion}
          className="mt-3 text-lg leading-relaxed text-muted-foreground [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[var(--brand-primario)] [&_p]:mt-2 [&_p]:first:mt-0"
        />
      </section>

      {/* Qué se trabaja */}
      <section className="mt-12">
        <h2 className="text-xl font-bold">Se trabaja</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {servicio.incluye.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-xl border p-4">
              <MessageSquare className="mt-0.5 size-4 shrink-0 text-[var(--brand-acento)]" />
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Cómo funciona la sesión */}
      <section className="mt-12">
        <h2 className="text-xl font-bold">Así funciona tu sesión</h2>
        <ol className="mt-5 space-y-4">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primario)] text-sm font-bold text-[var(--brand-acento)]">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{paso.titulo}</p>
                <p className="mt-1 text-sm text-muted-foreground">{paso.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Secciones descriptivas */}
      {servicio.detalles.length > 0 && (
        <section className="mt-12 space-y-6">
          {servicio.detalles.map((d) => (
            <article key={d.titulo} className="rounded-xl border p-6">
              <h3 className="text-lg font-semibold">{d.titulo}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d.texto}</p>
            </article>
          ))}
        </section>
      )}

      {/* CTA + precio por sesión */}
      <aside className="mt-12 rounded-3xl border bg-muted/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">Precio por sesión de {servicio.duracionMin} min</p>
        <p className="mt-1 text-4xl font-bold text-[var(--brand-primario)]">
          ${servicio.precio.toLocaleString("es-CO")}
          <span className="text-base font-normal text-muted-foreground"> USD</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Por {servicio.canal} · Coordinamos tus sesiones dentro de la
          plataforma y pagas cuando esté claro el plan.
        </p>
        <Button
          variant="accent"
          size="lg"
          className="mt-5 w-full max-w-xs"
          onClick={() => setCotizarAbierto(true)}
        >
          <CalendarClock className="size-4" />
          Cotizar mis sesiones
          <ArrowRight />
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Sin permanencia: si algo no se resuelve, seguimos con otra sesión al mismo precio.
        </p>
      </aside>

      <CotizarModal
        tipo="servicio"
        productoId={servicio.id}
        nombre={servicio.nombre}
        precio={servicio.precio}
        moneda={servicio.moneda}
        abierto={cotizarAbierto}
        onCambiar={setCotizarAbierto}
      />
    </div>
  );
}
