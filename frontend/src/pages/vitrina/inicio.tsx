import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  ClipboardList,
  Code2,
  GraduationCap,
  HeartHandshake,
  LifeBuoy,
  ListChecks,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarruselVertical } from "@/components/vitrina/carrusel-vertical";
import { usePublicacionesSeccion } from "@/components/blog/use-publicaciones-seccion";
import { useTema } from "@/lib/tema";
import { useModoEdicion } from "@/lib/modo-edicion";
import { EditableTexto } from "@/components/editor/editable-texto";
import { api } from "@/lib/api/cliente";
import { calcularOportunidad } from "@/lib/oportunidad";

interface Diferenciador {
  icono: typeof Code2;
  titulo: string;
  texto: string;
  /** Slug del blog al que enlaza "Conoce más" (solo si está publicado). */
  concepto?: string;
}

const DIFERENCIADORES: Diferenciador[] = [
  {
    icono: Code2,
    titulo: "Código a la medida",
    texto:
      "Nada de plantillas genéricas: cada proyecto se construye desde cero, con estándares profesionales.",
    concepto: "codigo-a-la-medida-o-plantillas",
  },
  {
    icono: ShieldCheck,
    titulo: "Soporte con garantía",
    texto:
      "Acompañamiento real después de la entrega, con garantía por 2, 6 o 12 meses según el paquete.",
    concepto: "garantia-y-soporte-postventa",
  },
  {
    icono: Target,
    titulo: "Pensado para vender",
    texto:
      "Diseño y desarrollo orientados a convertir visitantes en clientes, no solo a verse bonito.",
    concepto: "que-es-una-landing-page",
  },
  {
    icono: ListChecks,
    titulo: "Proceso transparente",
    texto:
      "Sigue tu proyecto por etapas y con fecha de entrega clara desde el día de la compra.",
    concepto: "proceso-de-un-proyecto-web",
  },
  {
    icono: Blocks,
    titulo: "Funcionalidades a tu medida",
    texto:
      "Suma pagos, reservas u otras funciones con precio según su complejidad, sin letra pequeña.",
    concepto: "funcionalidades-extra-para-tu-web",
  },
  {
    icono: BadgeCheck,
    titulo: "Tecnología con estándares",
    texto:
      "Pruebas, buenas prácticas y revisiones antes de publicar: entregamos calidad, no humo.",
  },
];

const VALORES = [
  {
    icono: GraduationCap,
    titulo: "Ingeniería de sistemas",
    texto:
      "Formación técnica seria detrás de cada decisión de diseño y arquitectura.",
  },
  {
    icono: Code2,
    titulo: "Experiencia real",
    texto:
      "Hemos construido software para producción: sabemos lo que funciona y lo que no.",
  },
  {
    icono: HeartHandshake,
    titulo: "Trato directo",
    texto:
      "Hablas con quien construye tu proyecto, sin intermediarios ni mensajes automáticos.",
  },
];

const PASOS = [
  {
    icono: ShoppingBag,
    titulo: "Elige tu paquete",
    texto:
      "Escoge el alcance que necesitas y suma funcionalidades con precio claro.",
  },
  {
    icono: ClipboardList,
    titulo: "Completa el briefing",
    texto:
      "Te guiamos para entregar textos, logos y requerimientos en un solo lugar.",
  },
  {
    icono: Wrench,
    titulo: "Construimos con seguimiento",
    texto:
      "Diseño, desarrollo y pruebas por etapas, con fecha de entrega fija.",
  },
  {
    icono: LifeBuoy,
    titulo: "Recibes soporte con garantía",
    texto:
      "Al entregar tu proyecto inicia la garantía: 2, 6 o 12 meses según el paquete.",
  },
];

export function Home() {
  const { cms } = useTema();
  const { modoEdicion } = useModoEdicion();
  const heroRef = useRef<HTMLElement | null>(null);
  const publicaciones = usePublicacionesSeccion("inicio");

  const [clientesPotenciales, setClientesPotenciales] = useState(20);
  const [ticketPromedio, setTicketPromedio] = useState(150000);
  const oportunidad = calcularOportunidad(clientesPotenciales, ticketPromedio);

  const guardarTexto = async (clave: string, valor: string): Promise<void> => {
    await api.patchEditor({ textos: { [clave]: valor } });
  };
  const textos = cms.textos;

  const EditText = ({ clave, valor }: { clave: string; valor: string }) => (
    <EditableTexto
      modoEdicion={modoEdicion}
      clave={clave}
      valor={valor}
      textos={textos}
      onGuardar={guardarTexto}
    />
  );

  // El hero se estira hasta el borde inferior del viewport (sin barra blanca).
  // Se recalcula si cambia la marquesina (que suma altura arriba) o la ventana.
  useEffect(() => {
    const medir = (): void => {
      const el = heroRef.current;
      if (!el) return;
      el.style.minHeight = `${Math.max(window.innerHeight - el.offsetTop, 480)}px`;
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [cms.marquesina.activo, cms.marquesina.texto]);

  return (
    <>
      {/*
        Hero a pantalla completa: texto a la izquierda y carrusel de pasos
        a la derecha. El fondo azul cubre hasta el borde inferior.
      */}
      <section
        ref={heroRef}
        className="flex min-h-[70vh] items-center bg-[var(--brand-primario)] text-white"
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-[var(--brand-acento)]">
              <Sparkles className="size-4" />
              Webs profesionales que sí venden
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
              <EditText clave="hero.titulo1" valor="¿Estás empezando?" />
              <span className="text-[var(--brand-acento)]">
                <EditText clave="hero.titulo2" valor=" Tu negocio merece una web que trabaje por ti." />
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              <EditText
                clave="hero.subtitulo"
                valor="Desde una landing que te lanza, hasta un panel con métricas para tomar decisiones. Sin tecnicismos: tú describes tu negocio, nosotros lo convertimos en una web lista para crecer."
              />
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--brand-acento)]/40 bg-[var(--brand-acento)]/10 px-4 py-2 text-sm font-semibold text-[var(--brand-acento)]">
              <Sparkles className="size-4" />
              La fase de planeación y diseño es completamente gratis
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <Link to="/productos">
                  Ver productos
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <Link to="/contacto">Contar mi idea</Link>
              </Button>
            </div>
          </div>

          <CarruselVertical />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">
          <EditText clave="porque.titulo" valor="¿Por qué elegir DaJu?" />
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          <EditText
            clave="porque.subtitulo"
            valor="No vendemos código: vendemos resultados para negocios que están arrancando o buscando la solución correcta."
          />
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {DIFERENCIADORES.map(({ icono: Icono, titulo, texto, concepto }) => {
            const enlazar = concepto && publicaciones.has(concepto);
            return (
              <article
                key={titulo}
                className="flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <Icono className="size-8 text-[var(--brand-acento)]" />
                <h3 className="mt-4 text-lg font-semibold">{titulo}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
                {enlazar && (
                  <Link
                    to={`/blog/${concepto}`}
                    className="mt-auto pt-4 text-sm font-semibold text-[var(--brand-primario)] underline underline-offset-4 hover:text-[var(--brand-acento)]"
                  >
                    Conoce más acerca de esto →
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/*
        La web te da resultados: prueba social con datos del sector + calculadora.
      */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-center text-3xl font-bold">
          <EditText clave="resultados.titulo" valor="¿Por qué tu negocio necesita una web hoy?" />
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          <EditText
            clave="resultados.subtitulo"
            valor="La digitalización dejó de ser una opción. Los datos del sector hablan por sí solos."
          />
        </p>

        <div className="mt-10 grid items-center gap-10 lg:grid-cols-2">
          {/* Datos del sector */}
          <div>
            <div className="flex items-end gap-3 rounded-2xl border bg-card p-5">
              <div className="h-44 flex items-end gap-3">
                {[2019, 2020, 2021, 2022, 2023, 2024].map((año, i) => {
                  const valor = [3350, 4280, 5600, 6000, 6320, 6410][i];
                  const max = 6410;
                  return (
                    <div key={año} className="flex h-full flex-col justify-end items-center gap-1">
                      <div
                        className={`w-8 rounded-t-md ${i === 5 ? "bg-[var(--brand-acento)]" : "bg-[var(--brand-primario)]/25"}`}
                        style={{ height: `${(valor / max) * 100}%` }}
                        title={`${año}: $${valor} mil millones`}
                      />
                      <span className="text-[10px] text-muted-foreground">{año}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Ventas globales de comercio electrónico (miles de millones USD).
              Fuente: Statista.
            </p>

            <ul className="mt-5 space-y-3">
              {[
                {
                  titulo: "81% investiga antes de comprar",
                  texto: "La mayoría de tus futuros clientes busca en línea antes de llamarte. Sin web, no apareces.",
                },
                {
                  titulo: "$6.4 billones en ventas globales",
                  texto: "El comercio electrónico mundial siguió creciendo cada año, incluso en pandemia.",
                },
                {
                  titulo: "Presencia digital = más pedidos",
                  texto: "Un negocio con web responde, muestra y cierra ventas mientras tú duermes.",
                },
              ].map((dato) => (
                <li key={dato.titulo} className="flex gap-3">
                  <TrendingUp className="mt-0.5 size-5 shrink-0 text-[var(--brand-acento)]" />
                  <div>
                    <p className="font-semibold">{dato.titulo}</p>
                    <p className="text-sm text-muted-foreground">{dato.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Datos del sector: no son una promesa de tus resultados. Tu
              crecimiento depende de tu oferta, tu estrategia y el seguimiento.
            </p>
            {publicaciones.has("statista-y-las-cifras-de-la-digitalizacion") && (
              <p className="mt-3">
                <Link
                  to="/blog/statista-y-las-cifras-de-la-digitalizacion"
                  className="text-sm font-semibold text-[var(--brand-primario)] underline underline-offset-4 hover:text-[var(--brand-acento)]"
                >
                  Conoce más aquí →
                </Link>
              </p>
            )}
          </div>

          {/* Calculadora de oportunidad */}
          <div className="rounded-2xl border bg-muted/40 p-6">
            <h3 className="text-lg font-bold">
              <EditText clave="resultados.calculadora.titulo" valor="Calcula tu oportunidad" />
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Mueve los controles: ¿cuántos clientes nuevos podrías captar al mes
              con una web bien hecha?
            </p>

            <div className="mt-5 space-y-5">
              <label className="block">
                <span className="text-sm font-medium">
                  Clientes potenciales al mes: <strong>{clientesPotenciales}</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={clientesPotenciales}
                  aria-label="Clientes potenciales al mes"
                  onChange={(e) => setClientesPotenciales(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--brand-acento)]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">
                  Ticket promedio: <strong>${ticketPromedio.toLocaleString("es-CO")}</strong>
                </span>
                <input
                  type="range"
                  min={50000}
                  max={1000000}
                  step={50000}
                  value={ticketPromedio}
                  aria-label="Ticket promedio"
                  onChange={(e) => setTicketPromedio(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--brand-acento)]"
                />
              </label>
            </div>

            <div className="mt-5 rounded-xl border bg-background p-4 text-center">
              <p className="text-sm text-muted-foreground">Ingresos mensuales posibles</p>
              <p className="mt-1 text-3xl font-bold text-[var(--brand-primario)]">
                ${oportunidad.mensual.toLocaleString("es-CO")}
              </p>
              <p className="text-xs text-muted-foreground">
                ≈ ${oportunidad.anual.toLocaleString("es-CO")} al año
              </p>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Es una estimación simple (clientes × ticket). El resultado real
              depende de tu oferta y del seguimiento de cada contacto.
            </p>
            {publicaciones.has("que-son-potenciales-clientes-y-tickets") && (
              <p className="mt-2">
                <Link
                  to="/blog/que-son-potenciales-clientes-y-tickets"
                  className="text-sm font-semibold text-[var(--brand-primario)] underline underline-offset-4 hover:text-[var(--brand-acento)]"
                >
                  Conoce más aquí →
                </Link>
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="accent" size="sm">
                <Link to="/productos">
                  Ver productos
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/contacto">Contar mi idea</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/*
        ¿Quiénes somos?: el equipo detrás de DaJu.
      */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid items-center gap-10 rounded-3xl bg-muted/60 p-8 lg:grid-cols-2 lg:p-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-primario)]/5 px-3 py-1 text-sm font-semibold text-[var(--brand-primario)]">
              <Sparkles className="size-4" />
              ¿Quiénes somos?
            </p>
            <h2 className="mt-4 text-3xl font-bold">
              <EditText clave="quienes.titulo" valor="Un equipo de ingenieros de sistemas detrás de cada proyecto" />
            </h2>
            <p className="mt-4 text-muted-foreground">
              <EditText
                clave="quienes.texto1"
                valor="DaJu nació de la convicción de que un negocio pequeño no debería conformarse con soluciones genéricas. Somos ingenieros de sistemas con altos conocimientos técnicos y experiencia construyendo software real: aplicamos esa rigurosidad a cada web que entregamos."
              />
            </p>
            <p className="mt-3 text-muted-foreground">
              <EditText
                clave="quienes.texto2"
                valor="No revendemos plantillas ni prometemos lo que no podemos cumplir. Diseñamos, desarrollamos, probamos y acompañamos: tu web sale a producción como saldría cualquier producto profesional, y si algo falla, respondemos."
              />
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="accent">
                <Link to="/contacto">
                  Trabajemos juntos
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/blog">Leer nuestro blog</Link>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {VALORES.map(({ icono: Icono, titulo, texto }) => (
              <div
                key={titulo}
                className="flex gap-4 rounded-2xl border bg-background p-5 shadow-sm"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
                  <Icono className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
        ¿Cómo funciona?: el camino del cliente en 4 pasos.
      */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-center text-3xl font-bold">
          <EditText clave="como.titulo" valor="¿Cómo funciona?" />
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          <EditText
            clave="como.subtitulo"
            valor="Cuatro pasos, sin sorpresas ni letra pequeña: así se ve trabajar con nosotros de principio a fin."
          />
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
            <article
              key={titulo}
              className="relative rounded-xl border bg-card p-6 shadow-sm"
            >
              <span className="absolute right-5 top-5 text-4xl font-bold text-[var(--brand-primario)]/10">
                {i + 1}
              </span>
              <Icono className="size-8 text-[var(--brand-acento)]" />
              <h3 className="mt-4 text-lg font-semibold">{titulo}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="accent" size="lg">
            <Link to="/productos">
              Empezar mi proyecto
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
