import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Code2,
  GraduationCap,
  HeartHandshake,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarruselVertical } from "@/components/vitrina/carrusel-vertical";
import { usePublicacionesSeccion } from "@/components/blog/use-publicaciones-seccion";
import { useTema } from "@/lib/tema";

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

export function Home() {
  const { cms } = useTema();
  const heroRef = useRef<HTMLElement | null>(null);
  const publicaciones = usePublicacionesSeccion("inicio");

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
              ¿Estás empezando?{" "}
              <span className="text-[var(--brand-acento)]">
                Tu negocio merece una web que trabaje por ti.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Desde una landing que te lanza, hasta un panel con métricas para
              tomar decisiones. Sin tecnicismos: tú describes tu negocio, nosotros
              lo convertimos en una web lista para crecer.
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
          ¿Por qué elegir DaJu?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          No vendemos código: vendemos resultados para negocios que están
          arrancando o buscando la solución correcta.
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
              Un equipo de ingenieros de sistemas detrás de cada proyecto
            </h2>
            <p className="mt-4 text-muted-foreground">
              DaJu nació de la convicción de que un negocio pequeño no debería
              conformarse con soluciones genéricas. Somos ingenieros de sistemas
              con altos conocimientos técnicos y experiencia construyendo
              software real: aplicamos esa rigurosidad a cada web que entregamos.
            </p>
            <p className="mt-3 text-muted-foreground">
              No revendemos plantillas ni prometemos lo que no podemos cumplir.
              Diseñamos, desarrollamos, probamos y acompañamos: tu web sale a
              producción como saldría cualquier producto profesional, y si algo
              falla, respondemos.
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
    </>
  );
}
