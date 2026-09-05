import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Clock,
  Code2,
  HelpCircle,
  ImageIcon,
  Layers,
  Lightbulb,
  MessagesSquare,
  Rocket,
  SearchCheck,
  Table2,
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

interface Recomendacion {
  tipo: Paquete["tipo"];
  pregunta: string;
  texto: string;
}

const RECOMENDACIONES: Recomendacion[] = [
  {
    tipo: "validor",
    pregunta: "¿Estás arrancando y quieres validar tu idea en internet?",
    texto:
      "Empezar no requiere una web gigante: una sola vista enfocada en convertir, con entrega rápida y 2 meses de soporte, es suficiente para probar tu idea sin sobre-invertir.",
  },
  {
    tipo: "corporativo",
    pregunta: "¿Ya tienes negocio y necesitas presencia seria?",
    texto:
      "Si necesitas que te encuentren, te entiendan y te contacten, una web de hasta 4 vistas con 6 meses de soporte te da la credibilidad que tu negocio en marcha merece.",
  },
  {
    tipo: "operativo",
    pregunta: "¿Quieres dejar las planillas y ver tus datos en un panel?",
    texto:
      "Si tu operación ya no cabe en la memoria ni en el cuaderno, un mini-dashboard con CRUD y métricas a tu medida —con 1 año de soporte— es el siguiente paso natural.",
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
                        <span className="text-2xl font-bold text-[var(--brand-primario)]">
                          ${paquete.precio.toLocaleString("es-CO")}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Clock className="size-3" />
                          {paquete.diasEntrega} días hábiles
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
                <p className="inline-flex items-baseline gap-1.5 rounded-full border border-[var(--brand-acento)]/40 bg-[var(--brand-acento)]/10 px-3 py-1">
                  Desde{" "}
                  <span className="text-lg font-bold text-[var(--brand-primario)]">
                    ${desde.toLocaleString("es-CO")}
                  </span>
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
          {CONSULTORIAS.map(({ icono: Icono, titulo, descripcion, para }) => (
            <article
              key={titulo}
              className="flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
                <Icono className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{titulo}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{descripcion}</p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primario)]/10 bg-[var(--brand-primario)]/[0.04] px-3 py-2 text-xs text-muted-foreground">
                <Code2 className="size-3.5 shrink-0 text-[var(--brand-acento)]" />
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

      {/*
        ¿No sabes qué elegir?: comparativa y recomendaciones en un
        desplegable, para quien aún duda entre paquetes.
      */}
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
                            <tr className="bg-[var(--brand-primario)] text-white">
                              <th className="p-4 font-semibold">Característica</th>
                              {paquetes.map((p) => (
                                <th key={p.id} className="p-4 font-semibold">
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

                {RECOMENDACIONES.map((rec) => {
                  const paquete = paquetes?.find((p) => p.tipo === rec.tipo) ?? null;
                  return (
                    <AccordionItem
                      key={rec.tipo}
                      value={`recomendacion-${rec.tipo}`}
                      className="border-b last:border-0"
                    >
                      <AccordionTrigger className="data-[state=open]:bg-[var(--brand-primario)] data-[state=open]:text-white hover:bg-[var(--brand-acento)]/10 hover:text-[var(--brand-primario)] data-[state=open]:hover:bg-[var(--brand-primario)] data-[state=open]:hover:text-white">
                        {rec.pregunta}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-5 sm:px-6">
                        <p className="leading-relaxed">{rec.texto}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {paquete && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-acento)]/15 px-3 py-1 text-sm font-semibold text-[var(--brand-primario)]">
                              <Check className="size-4" />
                              Recomendado: {paquete.nombre}
                            </span>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {paquete
                              ? DESCRIPCION_TIPO[paquete.tipo].toLowerCase() + "."
                              : "La recomendación depende del momento de tu negocio: lo conversamos sin compromiso."}
                          </p>
                        </div>
                        {paquete && (
                          <div className="mt-4">
                            <Button asChild variant="outline">
                              <Link to={`/productos/${paquete.slug}`}>
                                Ver el paquete {paquete.nombre} en detalle
                                <ArrowRight />
                              </Link>
                            </Button>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}

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
    </div>
  );
}
