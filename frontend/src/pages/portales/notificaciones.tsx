import { useEffect, useState } from "react";
import { ArrowLeft, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import type { Notificacion } from "@/lib/api/tipos";

function fecha(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Centro de notificaciones: nivel plataforma (negocio) y nivel proyecto. */
export function Notificaciones() {
  const [notifs, setNotifs] = useState<Notificacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = (): void => {
    api
      .notificaciones()
      .then((r) => setNotifs(r.notificaciones))
      .catch(() => setError("No pudimos cargar las notificaciones."));
  };

  useEffect(() => {
    cargar();
  }, []);

  const marcar = async (n: Notificacion): Promise<void> => {
    if (n.leida) return;
    try {
      await api.marcarNotificacionLeida(n.id);
      setNotifs((prev) =>
        prev ? prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) : prev,
      );
    } catch {
      // silencioso
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/cliente")}>
        <ArrowLeft className="size-4" /> Volver al portal
      </Button>
      <h1 className="mt-3 text-2xl font-bold">Notificaciones</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Novedades de plataforma (compras, pagos) y de tus proyectos (chat,
        citas, funciones y vistas).
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-2">
        {!notifs ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
            <BellOff className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Sin notificaciones. Cuando compres algo o el equipo responda, te avisaremos aquí.
            </p>
          </div>
        ) : (
          notifs.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => void marcar(n)}
              aria-label={n.leida ? `Notificación: ${n.titulo}` : `Marcar leída: ${n.titulo}`}
              className={`block w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/60 ${
                n.leida ? "opacity-60" : "border-[var(--brand-acento)]/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{n.titulo}</p>
                  {n.cuerpo && <p className="mt-1 text-sm text-muted-foreground">{n.cuerpo}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] text-muted-foreground">{fecha(n.createdAt)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      n.tipo === "plataforma"
                        ? "bg-[var(--brand-primario)]/[0.08] text-[var(--brand-primario)]"
                        : "bg-[var(--brand-acento)]/15 text-[var(--brand-primario)]"
                    }`}
                  >
                    {n.tipo === "plataforma" ? "Plataforma" : "Proyecto"}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
