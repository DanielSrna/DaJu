import { Check } from "lucide-react";

const PASOS = ["recibido", "diseno", "desarrollo", "entregado"] as const;
const ETIQUETAS: Record<(typeof PASOS)[number], string> = {
  recibido: "Recibido",
  diseno: "Diseño",
  desarrollo: "Desarrollo",
  entregado: "Entregado",
};

/** Barra de progreso del proyecto (monitor de estados). */
export function BarraProgreso({ estado }: { estado: string }) {
  const idx = PASOS.indexOf(
    (PASOS as readonly string[]).includes(estado)
      ? (estado as (typeof PASOS)[number])
      : "recibido",
  );
  const porcentaje = Math.round((idx / (PASOS.length - 1)) * 100);

  return (
    <div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso del proyecto"
      >
        <div
          className="rounded-full bg-gradient-to-r from-[var(--brand-primario)] to-[var(--brand-acento)] transition-all"
          style={{ width: `${Math.max(porcentaje, 8)}%` }}
        />
      </div>
      <ol className="mt-2 grid grid-cols-4 gap-1 text-[11px]">
        {PASOS.map((paso, i) => (
          <li
            key={paso}
            className={`flex items-center gap-1.5 ${
              i <= idx ? "font-semibold text-[var(--brand-primario)]" : "text-muted-foreground"
            }`}
          >
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                i < idx
                  ? "bg-green-100 text-green-700"
                  : i === idx
                    ? "bg-[var(--brand-acento)] text-[var(--brand-primario)]"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < idx ? <Check className="size-2.5" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{ETIQUETAS[paso]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
