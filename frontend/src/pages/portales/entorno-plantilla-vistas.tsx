import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavEntorno } from "@/components/portal/nav-entorno";
import { Semaforo } from "@/components/portal/semaforo";
import { PanelChat } from "@/components/portal/panel-chat";
import { api } from "@/lib/api/cliente";
import type { VistaDisenoPortal } from "@/lib/api/tipos";

/** Lista de vistas del entorno de plantilla (cada una en su página). */
export function EntornoPlantillaVistas() {
  const { id } = useParams<{ id: string }>();
  const [vistas, setVistas] = useState<VistaDisenoPortal[] | null>(null);

  useEffect(() => {
    if (!id) return;
    api.vistasEspacio(id).then((r) => setVistas(r.vistas)).catch(() => setVistas([]));
  }, [id]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = `/cliente/plantillas/${id}`)}>
        <ArrowLeft className="size-4" /> Volver al resumen
      </Button>
      <h1 className="mt-3 text-2xl font-bold">Vistas</h1>
      <NavEntorno familia="plantilla" id={id ?? ""} activo="vistas" />

      <div className="mt-6 space-y-3">
        {!vistas
          ? <p className="text-sm text-muted-foreground">Cargando vistas…</p>
          : vistas.length === 0
            ? <p className="text-sm text-muted-foreground">No hay vistas todavía.</p>
            : vistas.map((v) => (
                <a
                  key={v.id}
                  href={`/cliente/plantillas/${id}/vistas/${v.id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--brand-acento)]/60 hover:bg-[var(--brand-acento)]/5"
                >
                  <span>
                    <span className="block font-bold">{v.nombre}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {v.obraGris ? "Obra gris publicada" : "Sin obra gris"} · {v.archivos.length} archivo(s)
                    </span>
                  </span>
                  <Semaforo estado={v.estado} />
                </a>
              ))}
      </div>
    </div>
  );
}

/** Chat del entorno de plantilla. */
export function EntornoPlantillaChat() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = `/cliente/plantillas/${id}`)}>
        <ArrowLeft className="size-4" /> Volver al resumen
      </Button>
      <h1 className="mt-3 text-2xl font-bold">Chat del entorno</h1>
      <NavEntorno familia="plantilla" id={id ?? ""} activo="chat" />
      <div className="mt-4">
        <PanelChat contexto="espacio" contextoId={id ?? ""} alto="h-80" />
      </div>
    </div>
  );
}
