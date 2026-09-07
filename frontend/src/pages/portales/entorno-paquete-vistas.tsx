import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavEntorno } from "@/components/portal/nav-entorno";
import { Semaforo } from "@/components/portal/semaforo";
import { api } from "@/lib/api/cliente";
import type { BriefingV2 } from "@/lib/api/tipos";

/** Lista de vistas del proyecto: cada una en su propia página. */
export function EntornoPaqueteVistas() {
  const { id } = useParams<{ id: string }>();
  const [briefing, setBriefing] = useState<BriefingV2 | null>(null);
  const [nuevaVista, setNuevaVista] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cargar = (): void => {
    if (!id) return;
    api.briefingV2(id).then((r) => setBriefing(r.briefing)).catch(() => null);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const agregar = async (): Promise<void> => {
    if (!id || !nuevaVista.trim()) return;
    try {
      await api.crearVistaBriefing(id, nuevaVista.trim());
      setNuevaVista("");
      cargar();
    } catch {
      setError("No se pudo agregar la función. Revisa el nombre.");
    }
  };

  const vistas = briefing?.contenido.vistas ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = `/cliente/paquetes/${id}`)}>
        <ArrowLeft className="size-4" /> Volver al resumen
      </Button>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Vistas del proyecto</h1>
        <div className="flex gap-2">
          <input
            aria-label="Nueva función o vista"
            placeholder="Agregar función (ej. Blog propio)…"
            value={nuevaVista}
            onChange={(e) => setNuevaVista(e.target.value)}
            className="w-full max-w-64 rounded-md border px-3 py-2 text-sm"
          />
          <Button variant="accent" size="sm" onClick={() => void agregar()}>
            <Plus className="size-4" /> Agregar
          </Button>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Una vista equivale a una función: agrégala y el equipo la carga en el plan.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <NavEntorno familia="paquete" id={id ?? ""} activo="vistas" />

      <div className="mt-6 space-y-3">
        {!briefing ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : vistas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Agrega tu primera función con el botón de arriba.
          </p>
        ) : (
          vistas.map((v, i) => (
            <Link
              key={v.id}
              to={`/cliente/paquetes/${id}/vistas/${v.id}`}
              className="group flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--brand-acento)]/60 hover:bg-[var(--brand-acento)]/5"
            >
              <span>
                <span className="block font-bold">
                  {i + 1}. {v.nombre}
                </span>
                <span className="mt-1 line-clamp-1 block text-xs text-muted-foreground">
                  {v.requisitos || "Sin requisitos todavía…"}
                </span>
              </span>
              <Semaforo estado={v.semaforo} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
