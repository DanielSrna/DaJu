import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Settings2,
  X,
  Send,
  RotateCcw,
  Palette,
  CalendarDays,
  BadgePercent,
  Sparkles,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTema } from "@/lib/tema";
import { api } from "@/lib/api/cliente";

const PORCENTAJES = [20, 40, 70] as const;

interface DockEditorProps {
  /** Inyecta las funciones de persistencia (tests). Por defecto usan api. */
  persistir?: {
    patchEditor: typeof api.patchEditor;
    publicar: typeof api.publicarCms;
  };
}

/**
 * Dock flotante derecho del modo diseñador: edita la marquesina, el descuento
 * global, los días extra y la paleta. Los cambios se guardan en el BORRADOR
 * (PATCH /cms/editor) y se publican con "Publicar cambios"; "Deshacer" limpia
 * el borrador en la nube y devuelve la vitrina a lo publicado.
 */
export function DockEditor({ persistir }: DockEditorProps) {
  const { cms, recargar } = useTema();
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<"ok" | "error" | null>(null);

  const [marquesinaTexto, setMarquesinaTexto] = useState(cms.marquesina.texto);
  const [marquesinaActiva, setMarquesinaActiva] = useState(cms.marquesina.activo);
  const [descuentoActivo, setDescuentoActivo] = useState(cms.descuento.activo);
  const [porcentaje, setPorcentaje] = useState<20 | 40 | 70>(cms.descuento.porcentaje);
  const [mensajeDescuento, setMensajeDescuento] = useState(cms.descuento.mensaje);
  const [hasta, setHasta] = useState(cms.descuento.hasta ?? "");
  const [diasExtra, setDiasExtra] = useState(cms.diasExtra);
  const [colorPrimario, setColorPrimario] = useState(cms.colores.primario);
  const [colorAcento, setColorAcento] = useState(cms.colores.acento);

  const persistor = persistir ?? { patchEditor: api.patchEditor, publicar: api.publicarCms };

  /** Aplica la paleta al instante (vista previa del borrador). */
  const aplicarPaletaViva = useCallback((primario: string, acento: string) => {
    const raiz = document.documentElement;
    raiz.style.setProperty("--brand-primario", primario);
    raiz.style.setProperty("--brand-acento", acento);
    raiz.style.setProperty("--primary", acento);
    raiz.style.setProperty("--accent", acento);
  }, []);

  /** PATCH del borrador cuando cambia algo. */
  const sincronizar = useCallback(
    async (patch: Parameters<typeof api.patchEditor>[0]) => {
      try {
        await persistor.patchEditor(patch);
        setEstado("ok");
      } catch {
        setEstado("error");
      }
    },
    [persistor],
  );

  const publicar = async (): Promise<void> => {
    setGuardando(true);
    try {
      await persistor.publicar();
      setEstado("ok");
      await recargar();
    } catch {
      setEstado("error");
    } finally {
      setGuardando(false);
    }
  };

  const deshacer = async (): Promise<void> => {
    setGuardando(true);
    try {
      await recargar();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed bottom-0 right-0 z-40">
      {abierto ? (
        <div className="flex max-h-[82vh] w-72 flex-col overflow-hidden border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Settings2 className="size-4 text-[var(--brand-acento)]" />
              Panel de diseño
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cerrar panel"
              onClick={() => setAbierto(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5">
          {estado === "error" && (
            <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
              No se pudo guardar. Revisa tu sesión e inténtalo.
            </p>
          )}

          {/* Marquesina */}
          <section className="rounded-lg border p-2.5">
            <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-3 text-[var(--brand-acento)]" />
              Barra de promociones
            </h3>
            <div className="mt-2 flex items-center justify-between">
              <label htmlFor="marquesina-activa" className="text-sm">
                Activa
              </label>
              <input
                id="marquesina-activa"
                type="checkbox"
                role="switch"
                aria-label="Barra de promociones activa"
                checked={marquesinaActiva}
                onChange={(e) => {
                  setMarquesinaActiva(e.target.checked);
                  void sincronizar({ marquesina: { texto: marquesinaTexto, activo: e.target.checked } });
                }}
                className="size-4 accent-[var(--brand-acento)]"
              />
            </div>
            <input
              type="text"
              aria-label="Mensaje de la barra de promociones"
              placeholder="🎄 Oferta de fin de año"
              className="mt-2 w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
              value={marquesinaTexto}
              onChange={(e) => setMarquesinaTexto(e.target.value)}
              onBlur={() => void sincronizar({ marquesina: { texto: marquesinaTexto, activo: marquesinaActiva } })}
            />
          </section>

          {/* Descuento */}
          <section className="mt-2 rounded-lg border p-2.5">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <BadgePercent className="size-3.5 text-[var(--brand-acento)]" />
              Descuento global
            </h3>
            <div className="mt-2 flex items-center justify-between">
              <label htmlFor="descuento-activo" className="text-sm">
                Activo (solo si la barra lo anuncia)
              </label>
              <input
                id="descuento-activo"
                type="checkbox"
                role="switch"
                aria-label="Descuento activo"
                checked={descuentoActivo}
                onChange={(e) => {
                  setDescuentoActivo(e.target.checked);
                  void sincronizar({
                    descuento: { activo: e.target.checked, porcentaje, mensaje: mensajeDescuento, hasta: hasta || null },
                  });
                }}
                className="size-4 accent-[var(--brand-acento)]"
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-sm">
                % de descuento
                <select
                  aria-label="Porcentaje de descuento"
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
                  value={porcentaje}
                  onChange={(e) => {
                    const p = PORCENTAJES.find((x) => x === Number(e.target.value)) ?? 20;
                    setPorcentaje(p);
                    void sincronizar({
                      descuento: { activo: descuentoActivo, porcentaje: p, mensaje: mensajeDescuento, hasta: hasta || null },
                    });
                  }}
                >
                  {PORCENTAJES.map((p) => (
                    <option key={p} value={p}>
                      {p}%
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Vigente hasta
                <input
                  type="date"
                  aria-label="Vigente hasta"
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  onBlur={() =>
                    void sincronizar({
                      descuento: { activo: descuentoActivo, porcentaje, mensaje: mensajeDescuento, hasta: hasta || null },
                    })
                  }
                />
              </label>
            </div>
            <input
              type="text"
              aria-label="Mensaje del descuento"
              placeholder="Descuento del 40%"
              className="mt-2 w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
              value={mensajeDescuento}
              onChange={(e) => setMensajeDescuento(e.target.value)}
              onBlur={() =>
                void sincronizar({
                  descuento: { activo: descuentoActivo, porcentaje, mensaje: mensajeDescuento, hasta: hasta || null },
                })
              }
            />
            {!marquesinaActiva && (
              <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-700">
                El descuento no se aplica hasta que la barra de promociones esté activa.
              </p>
            )}
          </section>

          {/* Tiempo extra */}
          <section className="mt-2 rounded-lg border p-2.5">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="size-3.5 text-[var(--brand-acento)]" />
              Días hábiles extra (compras nuevas)
            </h3>
            <input
              type="number"
              min={0}
              aria-label="Días extra a todos los productos"
              className="mt-2 w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
              value={diasExtra}
              onChange={(e) => setDiasExtra(Math.max(0, Number(e.target.value) || 0))}
              onBlur={() => void sincronizar({ diasExtra })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              No modifica proyectos ya creados.
            </p>
          </section>

          {/* Colores */}
          <section className="mt-2 rounded-lg border p-2.5">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Palette className="size-3.5 text-[var(--brand-acento)]" />
              Paleta
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="text-sm">
                Primario
                <input
                  type="color"
                  aria-label="Color primario"
                  value={colorPrimario}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setColorPrimario(valor);
                    aplicarPaletaViva(valor, colorAcento);
                  }}
                  onBlur={() => void sincronizar({ colores: { primario: colorPrimario } })}
                  className="mt-1 block size-9 cursor-pointer rounded border"
                />
              </label>
              <label className="text-sm">
                Acento
                <input
                  type="color"
                  aria-label="Color acento"
                  value={colorAcento}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setColorAcento(valor);
                    aplicarPaletaViva(colorPrimario, valor);
                  }}
                  onBlur={() => void sincronizar({ colores: { acento: colorAcento } })}
                  className="mt-1 block size-9 cursor-pointer rounded border"
                />
              </label>
            </div>
          </section>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="accent"
              size="sm"
              className="flex-1"
              onClick={() => void publicar()}
              disabled={guardando}
            >
              <Send className="size-3.5" />
              Publicar cambios
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => void deshacer()}
              disabled={guardando}
            >
              <RotateCcw className="size-3.5" />
              Deshacer
            </Button>
          </div>

          {/* Gestión del catálogo */}
          <section className="mt-2 rounded-lg border p-2.5">
            <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <FolderKanban className="size-3 text-[var(--brand-acento)]" />
              Gestión del catálogo
            </h3>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <Button asChild variant="outline" size="sm" className="px-1 text-xs">
                <Link to="/admin/productos">Productos</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="px-1 text-xs">
                <Link to="/admin/plantillas">Plantillas</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="px-1 text-xs">
                <Link to="/admin/servicios">Servicios</Link>
              </Button>
            </div>
          </section>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="accent"
          size="sm"
          aria-label="Abrir panel"
          title="Panel de diseño"
          onClick={() => setAbierto(true)}
          className="gap-1.5 rounded-none border px-3 py-2 shadow-xl"
        >
          <Settings2 className="size-4" />
          Diseño
        </Button>
      )}
    </div>
  );
}
