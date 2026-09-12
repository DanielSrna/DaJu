import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelChat } from "@/components/portal/panel-chat";
import { Semaforo, type SemaforoEstado } from "@/components/portal/semaforo";
import { ArchivosVista, MarcoImagen } from "@/components/portal/archivos-vista";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";
import type { SolicitudFuncion, VistaDisenoPortal } from "@/lib/api/tipos";
import { BadgeCheck, Loader2 } from "lucide-react";

/** Página individual de una vista del entorno de plantilla. */
export function PaginaVistaPlantilla() {
  const { id, vistaId } = useParams<{ id: string; vistaId: string }>();
  const { usuario } = useModoEdicion();
  const esAdmin = usuario?.rol === "admin";
  const [vista, setVista] = useState<VistaDisenoPortal | null | "error">(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = (): void => {
    if (!id) return;
    api
      .vistasEspacio(id)
      .then((r) => {
        const v = r.vistas.find((x) => x.id === vistaId);
        if (!v) return setVista("error");
        setVista(v);
      })
      .catch(() => setVista("error"));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, vistaId]);

  if (vista === "error") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">No pudimos cargar la vista.</p>
      </div>
    );
  }
  if (!vista) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14">
        <p className="text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  const fijarEstado = async (estado: SemaforoEstado): Promise<void> => {
    try {
      await api.actualizarVista(vista.id, { estado });
      cargar();
    } catch {
      setError("No se pudo cambiar el estado.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (window.location.href = `/cliente/plantillas/${id}/vistas`)}
        >
          <ArrowLeft className="size-4" /> Volver a las vistas
        </Button>
        <Semaforo estado={vista.estado} />
      </div>

      <h1 className="mt-4 text-2xl font-bold">{vista.nombre}</h1>

      {/* Negociación → cotización → pago → pendiente (como en paquetes) */}
      <NegociacionVista espacioId={id ?? ""} vistaNombre={vista.nombre} esAdmin={esAdmin} onCambiar={cargar} />

      {esAdmin && (
        <div className="mt-3 flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Estado (admin):</span>
          {(["pendiente", "negociacion", "cotizacion", "aprobada"] as SemaforoEstado[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-label={`Estado ${s}`}
              onClick={() => void fijarEstado(s)}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                vista.estado === s
                  ? "border-[var(--brand-acento)] bg-[var(--brand-acento)]/15"
                  : "hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <MarcoImagen
          titulo="Obra gris (equipo)"
          imagen={vista.obraGris}
          subirLabel="Cambiar obra gris"
          autorizado={esAdmin}
          onSubir={async (f) => {
            await api.subirObraGris(vista.id, f);
            cargar();
          }}
        />
        <MarcoImagen
          titulo="Tu referencia"
          imagen={vista.muestraCliente}
          subirLabel="Subir referencia"
          autorizado={!esAdmin}
          onSubir={async (f) => {
            await api.subirMuestraVista(vista.id, f);
            cargar();
          }}
        />
      </div>

      <div className="mt-6">
        <ArchivosVista
          archivos={vista.archivos}
          etiqueta="Archivos de la vista"
          onSubir={async (f) => {
            await api.subirArchivoVista(vista.id, f);
            cargar();
          }}
          onEliminar={async (publicId) => {
            await api.eliminarArchivoVista(vista.id, publicId);
            cargar();
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

/** Negociación y pago de una vista/función de plantilla. */
function NegociacionVista({
  espacioId,
  vistaNombre,
  esAdmin,
  onCambiar,
}: {
  espacioId: string;
  vistaNombre: string;
  esAdmin: boolean;
  onCambiar: () => void;
}) {
  const [solicitud, setSolicitud] = useState<SolicitudFuncion | null>(null);
  const [costo, setCosto] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = (): void => {
    api
      .solicitudes(espacioId)
      .then((r) => setSolicitud(r.solicitudes.find((x) => x.titulo === vistaNombre) ?? null))
      .catch(() => null);
  };
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [espacioId, vistaNombre]);

  if (!solicitud) return null;

  const responder = async (): Promise<void> => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await api.responderSolicitud(solicitud!.id, { costo: Number(costo || 0), respuestaAdmin: texto.trim() });
      cargar();
      onCambiar();
    } catch {
      setError("No se pudo responder la solicitud.");
    } finally {
      setEnviando(false);
    }
  };
  const pagar = async (): Promise<void> => {
    setEnviando(true);
    try {
      const r = await api.aceptarSolicitud(solicitud!.id);
      window.location.href = `/cliente/pagar/${r.pago.id}`;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const ETIQUETA: Record<SolicitudFuncion["estado"], string> = {
    abierta: "Negociación abierta — el equipo cotizará pronto",
    respondida: "Cotización del equipo",
    aceptada: "Pago en proceso…",
    pagada: "Pagada ✓ — pendiente de desarrollo",
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
          <Button variant="accent" size="sm" disabled={enviando || !texto.trim()} onClick={() => void responder()}>
            {enviando ? <Loader2 className="size-3.5 animate-spin" /> : "Cotizar y enviar"}
          </Button>
        </div>
      )}
      {solicitud.estado === "respondida" && (
        <div className="mt-2 text-sm">
          <p><strong>Costo: ${solicitud.costo} USD</strong></p>
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
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
