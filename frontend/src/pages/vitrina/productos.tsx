import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Clock,
  Code2,
  ImageIcon,
  Layers,
  Lightbulb,
  MessagesSquare,
  Rocket,
  SearchCheck,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/cliente";
import type { Paquete } from "@/lib/api/tipos";

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

interface Plantilla {
  icono: typeof Rocket;
  nombre: string;
  descripcion: string;
  features: string[];
  desde: number;
}

/** Plantillas: solución web lista para desplegar. El cliente asume la nube. */
const PLANTILLAS: Plantilla[] = [
  {
    icono: BookOpenCheck,
    nombre: "Plantilla Reservas",
    descripcion:
      "Web lista para que tus clientes reserven citas o turnos y tú las administres sin planillas.",
    features: ["Calendario de disponibilidad", "Confirmaciones por correo", "Panel simple para el negocio"],
    desde: 550000,
  },
  {
    icono: Table2,
    nombre: "Plantilla Inventario",
    descripcion:
      "Solución para llevar tus productos y existencias en línea, lista para desplegar.",
    features: ["Registro de productos", "Control de existencias", "Informes básicos de movimiento"],
    desde: 650000,
  },
  {
    icono: MessagesSquare,
    nombre: "Plantilla Cotizador",
    descripcion:
      "Tus clientes arman su pedido o cotización desde la web y llegan a tu correo listos para responder.",
    features: ["Formulario por pasos", "Cálculo de precios", "Notificación al negocio"],
    desde: 500000,
  },
];

interface Consultoria {
  icono: typeof SearchCheck;
  titulo: string;
  descripcion: string;
  para: string;
}

/** Consultoría: servicios de alto nivel agendados por sesiones. */
const CONSULTORIAS: Consultoria[] = [
  {
    icono: SearchCheck,
    titulo: "Auditoría de código",
    descripcion:
      "Revisión experta de un proyecto existente: calidad, seguridad y deuda técnica con plan de acción.",
    para: "Para quien ya tiene web o sistema y sospecha que algo no está bien.",
  },
  {
    icono: Rocket,
    titulo: "Aceleración de proyectos",
    descripcion:
      "Nos sumamos a tu equipo por sesiones para destrabar lo que se quedó estancado.",
    para: "Para startups y equipos con entregas atrasadas o bloqueos técnicos.",
  },
  {
    icono: Lightbulb,
    titulo: "Asesoría técnica",
    descripcion:
      "Resuelve tus dudas de arquitectura, tecnología o decisión de compra con un ingeniero.",
    para: "Para quien quiere tomar decisiones informadas antes de invertir.",
  },
];

export function Productos() {
  const [paquetes, setPaquetes] = useState<Paquete[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = (): void => {
    setPaquetes(null);
    setError(null);
    api
      .paquetes()
      .then((r) => setPaquetes(r.paquetes))
      .catch(() => setError("No pudimos cargar los productos. Intenta de nuevo."));
  };

  useEffect(cargar, []);

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
            {/* Comparativa rápida entre paquetes */}
            <div className="mt-8 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className="p-4 font-semibold">Característica</th>
                    {paquetes.map((p) => (
                      <th key={p.id} className="p-4 font-semibold">
                        {p.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
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
                      valor: (p: Paquete) =>
                        `$${p.precio.toLocaleString("es-CO")}`,
                      destacado: true,
                    },
                  ].map((fila) => (
                    <tr key={fila.etiqueta} className="border-b last:border-0">
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
                </tbody>
              </table>
            </div>

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
                    <p className="inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      <Layers className="size-3" />
                      {DESCRIPCION_TIPO[paquete.tipo]}
                    </p>
                    <h3 className="mt-3 text-xl font-bold">{paquete.nombre}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {paquete.descripcion}
                    </p>

                    <ul className="mt-4 space-y-2">
                      {paquete.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 size-4 shrink-0 text-[var(--brand-acento)]" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-6">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold">
                          ${paquete.precio.toLocaleString("es-CO")}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {paquete.diasEntrega} días hábiles
                        </span>
                      </div>
                      <Button asChild className="mt-3 w-full" variant="accent">
                        <Link to={`/productos/${paquete.slug}`}>
                          Ver detalle
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
        Plantillas: soluciones web listas para desplegar.
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
          {PLANTILLAS.map(({ icono: Icono, nombre, descripcion, features, desde }) => (
            <article
              key={nombre}
              className="flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
                <Icono className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{nombre}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{descripcion}</p>
              <ul className="mt-4 space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--brand-acento)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-5">
                <p className="text-sm text-muted-foreground">
                  Desde{" "}
                  <span className="text-lg font-bold text-[var(--brand-primario)]">
                    ${desde.toLocaleString("es-CO")}
                  </span>{" "}
                  + nube
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
          {CONSULTORIAS.map(({ icono: Icono, titulo, descripcion, para }) => (
            <article
              key={titulo}
              className="flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <Icono className="size-8 text-[var(--brand-acento)]" />
              <h3 className="mt-4 text-lg font-bold">{titulo}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{descripcion}</p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Code2 className="size-3.5 shrink-0" />
                {para}
              </p>
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
    </div>
  );
}
