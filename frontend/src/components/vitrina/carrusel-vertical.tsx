import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTema } from "@/lib/tema";
import type { CarruselItem } from "@/lib/api/tipos";

const PASO_AUTO_MS = 3600;
const MIN_CARTAS = 6;

interface Slide {
  key: string;
  titulo: string;
  texto: string;
  link: string;
}

const OFERTAS_DEFECTO: Slide[] = [
  { key: "def-1", titulo: "Lanza tu web en 10 días", texto: "Landing profesional con soporte incluido", link: "/productos/validor" },
  { key: "def-2", titulo: "Tu negocio merece una web que venda", texto: "Web corporativa de hasta 4 vistas", link: "/productos/corporativo" },
  { key: "def-3", titulo: "Datos claros para decidir mejor", texto: "Mini-dashboard con métricas y soporte", link: "/productos/operativo" },
  { key: "def-4", titulo: "Pagos con PSE, NEQUI y tarjetas", texto: "Cobra como tus clientes prefieren", link: "/contacto" },
  { key: "def-5", titulo: "Soporte con garantía incluida", texto: "2, 6 o 12 meses según el paquete", link: "/postventa" },
  { key: "def-6", titulo: "De la idea a la web lista", texto: "Briefing guiado en cada proyecto", link: "/blog" },
  { key: "def-7", titulo: "Plantillas listas para desplegar", texto: "Reservas, inventario y más", link: "/productos#plantillas" },
  { key: "def-8", titulo: "Consultoría por sesiones", texto: "Auditorías, asesoría y aceleración", link: "/productos#consultoria" },
  { key: "def-9", titulo: "Aprende sin tecnicismos", texto: "Conceptos y noticias en nuestro blog", link: "/blog" },
  { key: "def-10", titulo: "Cuéntanos tu idea", texto: "Conversemos y cotizamos sin presión", link: "/contacto" },
];

/** Posición de una carta según su distancia al centro (patrón coverflow). */
function offsetDe(distancia: number, n: number) {
  if (distancia === 0) return { y: 0, escala: 1.14, opacidad: 1, z: 10 };
  if (distancia === 1) return { y: 168, escala: 0.94, opacidad: 0.9, z: 6 };
  if (distancia === 2) return { y: 336, escala: 0.86, opacidad: 0.55, z: 4 };
  if (distancia === n - 1) return { y: -168, escala: 0.94, opacidad: 0.9, z: 6 };
  if (distancia === n - 2) return { y: -336, escala: 0.86, opacidad: 0.55, z: 4 };
  // Ocultas: fuera del área visible (bajo el contenedor), sin texto perceptible.
  return { y: 520, escala: 0.86, opacidad: 0, z: 0 };
}

function Tarjeta({ slide, oro }: { slide: Slide; oro: boolean }) {
  const contenido = (
    <article
      data-enfasis={oro ? "true" : "false"}
      className={`relative flex h-full w-full items-center overflow-hidden rounded-2xl px-5 shadow-lg ${
        oro ? "carta-oro" : "carta-base"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-10 size-32 rounded-full ${
          oro ? "bg-white/25" : "bg-[var(--brand-acento)]/20"
        }`}
      />
      <div className="relative">
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
            oro ? "text-[var(--brand-primario)]/70" : "text-[var(--brand-acento)]"
          }`}
        >
          DaJu · Oferta
        </p>
        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug">{slide.titulo}</h3>
        {slide.texto && (
          <p className={`mt-1 line-clamp-1 text-xs ${oro ? "text-[var(--brand-primario)]/70" : "text-white/60"}`}>
            {slide.texto}
          </p>
        )}
      </div>
      {slide.link && (
        <ArrowRight
          className={`absolute bottom-4 right-4 size-4 ${oro ? "text-[var(--brand-primario)]" : "text-[var(--brand-acento)]"}`}
        />
      )}
    </article>
  );

  // La carta con enlace es navegable (link interno); sin enlace se queda estática.
  // Los links del CMS pueden llegar absolutos: se normalizan a la ruta interna
  // (así la carta siempre navega dentro de la web y no a un dominio ajeno).
  const rutaInterna = slide.link
    ? (() => {
        try {
          return new URL(slide.link).pathname + new URL(slide.link).search;
        } catch {
          return slide.link;
        }
      })()
    : "";
  return rutaInterna ? (
    <Link to={rutaInterna} className="block h-full w-full focus-visible:outline-none" aria-label={slide.titulo}>
      {contenido}
    </Link>
  ) : (
    contenido
  );
}

/**
 * Carrusel vertical infinito (patrón coverflow del ejemplo de referencia):
 * todas las cartas viven siempre en escena y se deslizan suavemente entre
 * posiciones (arriba → centro → abajo) con transición CSS por tarjeta.
 * La carta central es la protagonista: dorada y más grande. El ciclo es
 * automático; los extremos se funden para que la envoltura sea invisible.
 */
export function CarruselVertical() {
  const { cms } = useTema();
  const [centro, setCentro] = useState(0);

  const slides: Slide[] = (() => {
    const delCms = cms.carrusel.map((item: CarruselItem) => ({
      key: item.id,
      titulo: item.titulo || "Oferta DaJu",
      texto: "",
      link: item.link ?? "",
    }));
    const lista = [...delCms];
    const usados = new Set(lista.map((s) => s.titulo.toLowerCase()));
    let i = 0;
    while (lista.length < MIN_CARTAS && i < OFERTAS_DEFECTO.length * 2) {
      const candidata = OFERTAS_DEFECTO[i % OFERTAS_DEFECTO.length];
      const clave = candidata.titulo.toLowerCase();
      if (!usados.has(clave)) {
        lista.push(candidata);
        usados.add(clave);
      }
      i += 1;
    }
    return lista;
  })();

  const total = slides.length;

  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => setCentro((c) => (c + 1) % total), PASO_AUTO_MS);
    return () => clearInterval(id);
  }, [total]);

  return (
    <div className="relative mx-auto h-[520px] w-full max-w-sm overflow-hidden">
      {slides.map((slide, i) => {
        const distancia = (((i - centro) % total) + total) % total;
        const pos = offsetDe(distancia, total);
        const oculta = pos.opacidad === 0;
        return (
          <div
            key={slide.key}
            className="carrusel-carta"
            style={{
              transform: `translateY(${pos.y}px) scale(${pos.escala})`,
              opacity: pos.opacidad,
              zIndex: pos.z,
              // Las cartas ocultas se teletransportan (sin cruzar el área
              // visible): solo funden su opacidad en su posición de salida.
              transition: oculta
                ? "transform 0s, opacity 0.25s ease"
                : undefined,
            }}
          >
            <Tarjeta slide={slide} oro={distancia === 0} />
          </div>
        );
      })}
    </div>
  );
}
