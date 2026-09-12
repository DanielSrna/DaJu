import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Blocks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavEntorno } from "@/components/portal/nav-entorno";
import { BarraEtapas } from "@/components/portal/barra-etapas";
import { EditorEtapas } from "@/components/portal/editor-etapas";
import { ResumenProyecto } from "@/components/portal/resumen-proyecto";
import { SeccionDocumentacion } from "@/components/portal/seccion-documentacion";
import { Semaforo } from "@/components/portal/semaforo";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";
import type { EspacioPortal, VistaDisenoPortal } from "@/lib/api/tipos";

/** Resumen del entorno de plantilla: enlaces a vistas, funciones y chat. */
export function EntornoPlantilla() {
  const { id } = useParams<{ id: string }>();
  const [vistas, setVistas] = useState<VistaDisenoPortal[] | null>(null);
  const [espacio, setEspacio] = useState<EspacioPortal | null>(null);
  const { usuario } = useModoEdicion();
  const esAdmin = usuario?.rol === "admin";

  const cargar = (): void => {
    if (!id) return;
    api.vistasEspacio(id).then((r) => setVistas(r.vistas)).catch(() => setVistas([]));
    api.espacio(id).then((r) => setEspacio(r.espacio)).catch(() => null);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

      {espacio && (
        <section className="mt-6 rounded-2xl border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Progreso por etapas
          </h2>
          <div className="mt-3">
            <BarraEtapas
              etapas={espacio.etapas ?? []}
              montoPagado={espacio.montoPagado ?? 0}
              montoTotal={espacio.montoTotal ?? 0}
              moneda={espacio.moneda ?? "USD"}
              onPagar={(pagoId) =>
                (window.location.href = `/cliente/pagar/${pagoId}`)
              }
            />
          </div>
          {esAdmin && id && (
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--brand-primario)]">
                Editar etapas y pagos (admin)
              </summary>
              <EditorEtapas
                familia="espacio"
                id={id}
                etapas={espacio.etapas ?? []}
                precioBase={espacio.precioBase ?? 0}
                moneda={espacio.moneda ?? "USD"}
                onCambiar={cargar}
              />
            </details>
          )}
        </section>
      )}

      {/* Resumen del proyecto: composición, costos, impacto y pruebas */}
      {id && <ResumenProyecto familia="espacio" id={id} esAdmin={esAdmin} />}

      {/* Documentación: manuales PDF */}
      {id && (
        <SeccionDocumentacion familia="espacio" id={id} esAdmin={esAdmin} />
      )}

      {/* Vista list preview to pages */}
      <h2 className="mt-8 text-lg font-bold">Vistas</h2>
      <div className="mt-3 space-y-3">
        {!vistas
          ? <p className="text-sm text-muted-foreground">Cargando vistas…</p>
          : vistas.length === 0
            ? <p className="text-sm text-muted-foreground">Aún no hay vistas. Agrégalas desde la pestaña Vistas.</p>
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
