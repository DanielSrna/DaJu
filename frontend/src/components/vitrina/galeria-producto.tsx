import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

export interface VistaImagen {
  url: string;
  publicId: string;
}

interface Props {
  vistas: VistaImagen[];
  nombre: string;
}

/** Ritmo de auto-rotación (lento, para no molestar). */
const VELOCIDAD_ROTACION_MS = 5000;

/**
 * Galería del detalle de producto: marco principal con flechas anterior/
 * siguiente (ciclo), contador, miniaturas clicables y zoom a pantalla
 * completa al hacer clic en el centro. Pensada para móvil: botones ≥ 40px
 * siempre visibles y el zoom usa object-contain.
 *
 * Comportamiento de los controles: en dispositivos con puntero fino (mouse)
 * permanecen ocultos hasta que el mouse entra al marco; en pantallas táctiles
 * se mantienen siempre visibles (no hay hover). La galería rota sola
 * lentamente y la rotación se cancela para siempre en la primera interacción
 * (mouse encima, toque o clic) hasta recargar la página.
 */
export function GaleriaProducto({ vistas, nombre }: Props) {
  const [indice, setIndice] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [rotacionCancelada, setRotacionCancelada] = useState(false);

  const total = vistas.length;
  const actual = vistas[Math.min(indice, total - 1)]!;

  const siguiente = () => setIndice((i) => (i + 1) % total);
  const anterior = () => setIndice((i) => (i - 1 + total) % total);
  const cancelarRotacion = () => setRotacionCancelada(true);

  // Auto-rotación lenta: muere en la primera interacción y no vuelve.
  useEffect(() => {
    if (rotacionCancelada || total <= 1) return;
    const movimientoNulo =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (movimientoNulo) return;
    const id = setInterval(() => setIndice((i) => (i + 1) % total), VELOCIDAD_ROTACION_MS);
    return () => clearInterval(id);
  }, [rotacionCancelada, total]);

  useEffect(() => {
    if (!zoom) return;
    const anteriorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      else if (e.key === "ArrowLeft") setIndice((i) => (i - 1 + total) % total);
      else if (e.key === "ArrowRight") setIndice((i) => (i + 1) % total);
    };
    window.addEventListener("keydown", alPulsar);
    return () => {
      document.body.style.overflow = anteriorOverflow;
      window.removeEventListener("keydown", alPulsar);
    };
  }, [zoom, total]);

  const claseControles = "transition-opacity duration-200 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100";

  return (
    <div className="space-y-4">
      {/* Marco principal */}
      <div
        className="group relative overflow-hidden rounded-xl bg-muted"
        onMouseEnter={cancelarRotacion}
        onPointerDown={cancelarRotacion}
        onFocus={cancelarRotacion}
      >
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={anterior}
              aria-label="Imagen anterior"
              className={`absolute inset-y-0 left-2 z-10 my-auto flex size-10 items-center justify-center rounded-full bg-white/90 text-[var(--brand-primario)] shadow-md backdrop-blur-sm hover:bg-white sm:left-3 sm:size-11 ${claseControles}`}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={siguiente}
              aria-label="Imagen siguiente"
              className={`absolute inset-y-0 right-2 z-10 my-auto flex size-10 items-center justify-center rounded-full bg-white/90 text-[var(--brand-primario)] shadow-md backdrop-blur-sm hover:bg-white sm:right-3 sm:size-11 ${claseControles}`}
            >
              <ChevronRight className="size-5" />
            </button>
            <span
              className={`absolute bottom-2 right-2 z-10 rounded-full bg-[var(--brand-primario)]/75 px-2.5 py-1 text-xs font-semibold text-white ${claseControles}`}
            >
              {indice + 1} / {total}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            cancelarRotacion();
            setZoom(true);
          }}
          aria-label="Ampliar imagen"
          className="block w-full cursor-zoom-in"
        >
          <img
            src={actual.url}
            alt={`Vista ${indice + 1} de ${nombre}`}
            className="aspect-[3/2] w-full object-cover"
            draggable={false}
          />
        </button>
        <span
          className={`pointer-events-none absolute bottom-2 left-2 z-10 flex items-center gap-1.5 rounded-full bg-[var(--brand-primario)]/60 px-2.5 py-1 text-[11px] font-medium text-white ${claseControles}`}
        >
          <Maximize2 className="size-3" /> Ampliar
        </span>
      </div>

      {/* Miniaturas */}
      <div className="grid grid-cols-4 gap-3">
        {vistas.map((v, i) => (
          <button
            key={v.publicId}
            type="button"
            onClick={() => {
              cancelarRotacion();
              setIndice(i);
            }}
            aria-label={`Ver imagen ${i + 1}`}
            aria-current={i === indice}
            className={`aspect-square w-full overflow-hidden rounded-lg border-2 transition ${
              i === indice
                ? "border-[var(--brand-acento)] opacity-100"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <img src={v.url} alt="" className="h-full w-full object-cover" draggable={false} />
          </button>
        ))}
      </div>

      {/* Zoom a pantalla completa */}
      {zoom && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ampliada de ${nombre}`}
          onClick={() => setZoom(false)}
        >
          <div className="flex items-center justify-between p-3 sm:p-4">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              {indice + 1} / {total}
            </span>
            <button
              type="button"
              onClick={() => setZoom(false)}
              aria-label="Cerrar vista ampliada"
              className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:size-11"
            >
              <X className="size-5" />
            </button>
          </div>
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-5 sm:px-20"
            onClick={(e) => e.stopPropagation()}
          >
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={anterior}
                  aria-label="Imagen anterior"
                  className="absolute left-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:left-4 sm:size-11"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={siguiente}
                  aria-label="Imagen siguiente"
                  className="absolute right-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:right-4 sm:size-11"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
            <img
              src={actual.url}
              alt={`Vista ${indice + 1} de ${nombre} (ampliada)`}
              className="max-h-full max-w-full rounded-lg object-contain"
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
