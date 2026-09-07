import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Blocks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavEntorno } from "@/components/portal/nav-entorno";
import { Semaforo } from "@/components/portal/semaforo";
import { api } from "@/lib/api/cliente";
import type { VistaDisenoPortal } from "@/lib/api/tipos";

/** Resumen del entorno de plantilla: enlaces a vistas, funciones y chat. */
export function EntornoPlantilla() {
  const { id } = useParams<{ id: string }>();
  const [vistas, setVistas] = useState<VistaDisenoPortal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevaVista, setNuevaVista] = useState("");

  const cargar = (): void => {
    if (!id) return;
    api.vistasEspacio(id).then((r) => setVistas(r.vistas)).catch(() => setVistas([]));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const crearVista = async (): Promise<void> => {
    if (!id || !nuevaVista.trim()) return;
    try {
      await api.crearVista(id, nuevaVista.trim());
      setNuevaVista("");
      cargar();
    } catch {
      setError("No se pudo crear la vista.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/cliente")}>
        <ArrowLeft className="size-4" /> Volver al portal
      </Button>

      <div className="mt-3 flex items-center gap-2">
        <Blocks className="size-6 text-[var(--brand-acento)]" />
        <h1 className="text-2xl font-bold">Tu plantilla</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Diseña cada vista, sube tus referencias y pide funciones adicionales.
      </p>

      <NavEntorno familia="plantilla" id={id ?? ""} activo="resumen" />

      <div className="mt-6 flex gap-2">
        <input
          aria-label="Nombre de la vista"
          placeholder="Agregar nueva vista / función…"
          value={nuevaVista}
          onChange={(e) => setNuevaVista(e.target.value)}
          className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
        />
        <Button variant="accent" size="sm" onClick={() => void crearVista()}>
          <Plus className="size-4" /> Agregar nueva vista / función
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {/* Vista list preview to pages */}
      <h2 className="mt-8 text-lg font-bold">Vistas</h2>
      <div className="mt-3 space-y-3">
        {!vistas
          ? <p className="text-sm text-muted-foreground">Cargando vistas…</p>
          : vistas.length === 0
            ? <p className="text-sm text-muted-foreground">Aún no hay vistas. Crea la primera arriba.</p>
            : vistas.map((v) => (
                <Link
                  key={v.id}
                  to={`/cliente/plantillas/${id}/vistas/${v.id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--brand-acento)]/60 hover:bg-[var(--brand-acento)]/5"
                >
                  <span className="font-bold">{v.nombre}</span>
                  <Semaforo estado={v.estado} />
                </Link>
              ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link to={`/cliente/plantillas/${id}/funciones`} className="rounded-xl border p-5 transition-colors hover:border-[var(--brand-acento)]/60">
          <h2 className="font-bold">Funciones adicionales</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pide funciones; el equipo responde con costo.</p>
        </Link>
        <Link to={`/cliente/plantillas/${id}/chat`} className="rounded-xl border p-5 transition-colors hover:border-[var(--brand-acento)]/60">
          <h2 className="font-bold">Chat del entorno</h2>
          <p className="mt-1 text-sm text-muted-foreground">Mensajes generales con el equipo.</p>
        </Link>
      </div>
    </div>
  );
}
