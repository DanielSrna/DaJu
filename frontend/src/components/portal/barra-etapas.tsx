import { Check, Gift, Loader2, Lock, Play } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { EtapaPortal } from "@/lib/api/tipos";

interface Props {
  etapas: EtapaPortal[];
  montoPagado?: number;
  montoTotal?: number;
  moneda?: string;
  /** Si se pasa, muestra el botón de pago en las etapas habilitadas. */
  onPagar?: (pagoId: string) => void;
}

const COLOR_SEGMENTO: Record<EtapaPortal["estado"], string> = {
  completada: "bg-green-500",
  en_curso: "bg-[var(--brand-acento)]",
  bloqueada: "bg-muted",
};

/**
 * Barra de progreso personalizable: cada tramo es una etapa del plan.
 * Lo completado conserva su color; el tramo bloqueado por pago va gris
 * con candado y aviso, sin retroceder el avance logrado.
 */
export function BarraEtapas({
  etapas,
  montoPagado = 0,
  montoTotal = 0,
  moneda = "USD",
  onPagar,
}: Props) {
  const total = etapas.length;
  const completadas = etapas.filter((e) => e.estado === "completada").length;
  const porcentaje = total ? Math.round((completadas / total) * 100) : 0;

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        El equipo definirá las etapas de tu proyecto en la propuesta.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {completadas} de {total}{" "}
          {total === 1 ? "etapa completada" : "etapas completadas"}
        </span>
        <span className="text-muted-foreground">{porcentaje}%</span>
      </div>

      <div
        className="mt-2 flex gap-1"
        role="progressbar"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso por etapas del proyecto"
      >
        {etapas.map((e, i) => (
          <motion.div
            key={e._id}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            className={`h-2.5 flex-1 rounded-full ${COLOR_SEGMENTO[e.estado]}`}
            title={`${e.nombre} · ${e.estado}`}
          />
        ))}
      </div>

      {montoTotal > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Pagado ${montoPagado.toLocaleString("es-CO")} de $
          {montoTotal.toLocaleString("es-CO")} {moneda}
        </p>
      )}

      <ol className="mt-5 space-y-3">
        {etapas.map((e) => {
          const bloqueada = e.estado === "bloqueada";
          const pagoHabilitado =
            bloqueada && e.pagoEstado === "solicitado" && Boolean(e.pagoId);
          return (
            <li
              key={e._id}
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                bloqueada ? "bg-muted/40" : ""
              }`}
            >
              <span
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  e.estado === "completada"
                    ? "bg-green-100 text-green-700"
                    : e.estado === "en_curso"
                      ? "bg-[var(--brand-acento)]/20 text-[var(--brand-primario)]"
                      : "bg-muted text-muted-foreground"
                }`}
                aria-hidden="true"
              >
                {e.estado === "completada" ? (
                  <Check className="size-4" />
                ) : e.estado === "en_curso" ? (
                  <Play className="size-3.5" />
                ) : (
                  <Lock className="size-3.5" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {e.nombre}
                  {!e.requierePago && !/gratis/i.test(e.nombre) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">
                      <Gift className="size-3" /> Gratis
                    </span>
                  )}
                  {e.requierePago && e.monto > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      ${e.monto.toLocaleString("es-CO")}
                    </span>
                  )}
                </p>
                {e.descripcion && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.descripcion}
                  </p>
                )}
                {bloqueada && (
                  <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    {e.pagoEstado === "solicitado"
                      ? "Realiza el pago para poder continuar con esta etapa."
                      : "Se desbloqueará cuando el equipo habilite el pago de esta etapa."}
                  </p>
                )}
                {e.estado === "en_curso" && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--brand-primario)]">
                    <Loader2 className="size-3 animate-spin" /> En curso
                  </p>
                )}
              </div>

              {pagoHabilitado && onPagar && e.pagoId && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => onPagar(String(e.pagoId))}
                >
                  Pagar etapa
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
