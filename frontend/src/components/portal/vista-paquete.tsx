import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelChat } from "@/components/portal/panel-chat";
import { Semaforo, type SemaforoEstado } from "@/components/portal/semaforo";
import { ArchivosVista, MarcoImagen } from "@/components/portal/archivos-vista";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";
import type { BriefingV2, SolicitudFuncion, VistaBriefingPortal } from "@/lib/api/tipos";

/** Página individual de una vista del brief (paquete). */
export function VistaPaquete({
  proyectoId,
  vista,
  esAdmin,
  onCambiar,
}: {
  proyectoId: string;
  vista: VistaBriefingPortal;
  esAdmin: boolean;
  onCambiar: () => void;
}) {
  const [requisitos, setRequisitos] = useState(vista.requisitos ?? "");
  const [error, setError] = useState<string | null>(null);

  const fijarSemaforo = async (sem: SemaforoEstado): Promise<void> => {
    try {
      await api.actualizarVistaBriefing(proyectoId, vista.id, { semaforo: sem });
      onCambiar();
    } catch {
      setError("No se pudo cambiar el semáforo.");
    }
  };

  const guardarRequisitos = async (): Promise<void> => {
    try {
      await api.actualizarVistaBriefing(proyectoId, vista.id, { requisitos });
      onCambiar();
    } catch {
      setError("No se pudieron guardar los requisitos.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (window.location.href = `/cliente/paquetes/${proyectoId}/vistas`)}
        >
          <ArrowLeft className="size-4" /> Volver a las vistas
        </Button>
        <Semaforo estado={vista.semaforo} />
        {esAdmin && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Semáforo (admin):</span>
            {(["pendiente", "negociacion", "cotizacion", "aprobada"] as SemaforoEstado[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-label={`Semáforo ${s}`}
                onClick={() => void fijarSemaforo(s)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  vista.semaforo === s
                    ? "border-[var(--brand-acento)] bg-[var(--brand-acento)]/15"
                    : "hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <h1 className="mt-4 text-2xl font-bold">{vista.nombre}</h1>

      {/* Negociación → cobro → pago → lista para desarrollar */}
      <NegociacionPago proyectoId={proyectoId} vistaNombre={vista.nombre} esAdmin={esAdmin} onCambiar={onCambiar} />

      <label className="mt-6 block text-sm font-medium">
        <span>Requisitos que quieres en esta vista</span>
        <textarea
          rows={4}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          aria-label="Requisitos"
          value={requisitos}
          onChange={(e) => setRequisitos(e.target.value)}
          onBlur={() => void guardarRequisitos()}
        />
      </label>
      <Button variant="outline" size="sm" className="mt-2" onClick={() => void guardarRequisitos()}>
        Guardar requisitos
      </Button>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <MarcoImagen
          titulo="Obra gris (equipo)"
          imagen={vista.obraGris ?? null}
          subirLabel="Cambiar obra gris"
          autorizado={esAdmin}
          onSubir={async (f) => {
            await api.subirObraGrisBriefing(proyectoId, vista.id, f);
            onCambiar();
          }}
        />
        <ArchivosVista
          archivos={vista.archivos ?? []}
          etiqueta="Archivos de la vista"
          onSubir={async (f) => {
            await api.subirArchivoBriefingVista(proyectoId, vista.id, f);
            onCambiar();
          }}
          onEliminar={async (publicId) => {
            await api.eliminarArchivoBriefingVista(proyectoId, vista.id, publicId);
            onCambiar();
          }}
        />
      </div>

      <section className="mt-8">
        <p className="text-sm font-semibold">Negociación de esta vista</p>
        <div className="mt-2">
          <PanelChat contexto="vista" contextoId={vista.id} alto="h-64" />
        </div>
      </section>
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Negociación y pago de la vista/función: abierta → cotizada → pagada. */
function NegociacionPago({
  proyectoId,
  vistaNombre,
  esAdmin,
  onCambiar,
}: {
  proyectoId: string;
  vistaNombre: string;
  esAdmin: boolean;
  onCambiar: () => void;
}) {
  const [solicitud, setSolicitud] = useState<SolicitudFuncion | null>(null);
  const [costo, setCosto] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = (): void => {
    api
      .solicitudesProyecto(proyectoId)
      .then((r) => {
        const s = r.solicitudes.find((x) => x.titulo === vistaNombre);
        setSolicitud(s ?? null);
      })
      .catch(() => null);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId, vistaNombre]);

  const respond = async (): Promise<void> => {
    if (!solicitud || !texto.trim()) return;
    setEnviando(true);
    try {
      await api.responderSolicitud(solicitud.id, { costo: Number(costo || 0), respuestaAdmin: texto.trim() });
      cargar();
      onCambiar();
    } catch {
      // silencioso: recarga la vista
    } finally {
      setEnviando(false);
    }
  };

  const pagar = async (): Promise<void> => {
    if (!solicitud) return;
    setEnviando(true);
    try {
      const r = await api.aceptarSolicitud(solicitud.id);
      if (r.urlPago) {
        window.location.href = r.urlPago;
        return;
      }
    } catch {
      // silencioso
    } finally {
      setEnviando(false);
    }
  };

  if (!solicitud) return null;

  const ETIQUETA: Record<SolicitudFuncion["estado"], string> = {
    abierta: "Negociación abierta — el equipo cotizará pronto",
    respondida: "Cotización del equipo",
    aceptada: "Pago en proceso…",
    pagada: "Pagada ✓ — lista para desarrollar",
  };

  return (
    <section className="mt-5 rounded-xl border bg-muted/40 p-4">
      <p className="text-sm font-semibold">{ETIQUETA[solicitud.estado]}</p>

      {solicitud.estado === "abierta" && esAdmin && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr]">
          <input
            aria-label="Costo de la función"
            type="number"
            min={0}
            placeholder="Costo USD"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <input
            aria-label="Respuesta al cliente"
            placeholder="Respuesta para el cliente…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <Button variant="accent" size="sm" disabled={enviando || !texto.trim()} onClick={() => void respond()}>
            {enviando ? <Loader2 className="size-3.5 animate-spin" /> : "Cotizar y enviar"}
          </Button>
        </div>
      )}

      {solicitud.estado === "respondida" && (
        <div className="mt-2 text-sm">
          <p>
            <strong>Costo: ${solicitud.costo} USD</strong>
          </p>
          <p className="mt-1 text-muted-foreground">{solicitud.respuestaAdmin}</p>
          {!esAdmin && (
            <Button variant="accent" size="sm" className="mt-3" disabled={enviando} onClick={() => void pagar()}>
              {enviando ? <Loader2 className="size-3.5 animate-spin" /> : `Aceptar y pagar $${solicitud.costo} USD`}
            </Button>
          )}
        </div>
      )}

      {solicitud.estado === "pagada" && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
          <BadgeCheck className="size-4" /> El equipo la entra al plan de construcción.
        </p>
      )}
    </section>
  );
}
export function PaginaVistaPaquete() {
  const { id, vistaId } = useParams<{ id: string; vistaId: string }>();
  const [briefing, setBriefing] = useState<BriefingV2 | null | "error">(null);
  const { usuario } = useModoEdicion();

  const cargar = (): void => {
    if (!id) return;
    api
      .briefingV2(id)
      .then((r) => setBriefing(r.briefing))
      .catch(() => setBriefing("error"));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, vistaId]);

  if (briefing === "error") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">No pudimos cargar la vista.</p>
      </div>
    );
  }
  if (!briefing) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14">
        <p className="text-muted-foreground">Cargando…</p>
      </div>
    );
  }
  const vista = (briefing.contenido.vistas ?? []).find((v) => v.id === vistaId);
  if (!vista) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">La vista no existe.</p>
      </div>
    );
  }
  return (
    <VistaPaquete
      proyectoId={id!}
      vista={vista}
      esAdmin={usuario?.rol === "admin"}
      onCambiar={cargar}
    />
  );
}
