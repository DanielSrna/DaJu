import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavEntorno } from "@/components/portal/nav-entorno";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";
import type { SolicitudFuncion } from "@/lib/api/tipos";

const ETIQUETA: Record<SolicitudFuncion["estado"], { texto: string; clase: string }> = {
  abierta: { texto: "Pendiente", clase: "bg-muted text-muted-foreground" },
  respondida: { texto: "Respondida", clase: "bg-amber-100 text-amber-700" },
  aceptada: { texto: "Aceptada · por pagar", clase: "bg-sky-100 text-sky-700" },
  pagada: { texto: "Pagada ✓", clase: "bg-green-100 text-green-700" },
};

/** Funciones adicionales: cliente pide/paga; admin responde con costo. */
export function EntornoPlantillaFunciones() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useModoEdicion();
  const esAdmin = usuario?.rol === "admin";
  const [solicitudes, setSolicitudes] = useState<SolicitudFuncion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = (): void => {
    if (!id) return;
    api.solicitudes(id).then((r) => setSolicitudes(r.solicitudes)).catch(() => setSolicitudes([]));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const responder = async (
    s: SolicitudFuncion,
    costo: number,
    texto: string,
  ): Promise<void> => {
    try {
      await api.responderSolicitud(s.id, { costo, respuestaAdmin: texto });
      cargar();
    } catch {
      setError("No se pudo responder la solicitud.");
    }
  };

  const pagar = async (s: SolicitudFuncion): Promise<void> => {
    try {
      const r = await api.aceptarSolicitud(s.id);
      if (r.urlPago) {
        window.location.href = r.urlPago;
        return;
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = `/cliente/plantillas/${id}`)}>
        <ArrowLeft className="size-4" /> Volver al resumen
      </Button>
      <h1 className="mt-3 text-2xl font-bold">Funciones adicionales</h1>
      <NavEntorno familia="plantilla" id={id ?? ""} activo="funciones" />

      <section className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="font-bold">Vistas y funciones</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Una vista es una función: agrégala desde <strong>Vistas</strong> y
          negóciala ahí mismo (cotización → pago → desarrollo).
        </p>
      </section>
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-8 space-y-3">
        {!solicitudes
          ? <p className="text-sm text-muted-foreground">Cargando solicitudes…</p>
          : solicitudes.length === 0
            ? <p className="text-sm text-muted-foreground">Sin solicitudes todavía.</p>
            : solicitudes.map((s) => <SolicitudItem key={s.id} s={s} esAdmin={esAdmin} onResponder={responder} onPagar={pagar} />)}
      </div>
    </div>
  );
}

function SolicitudItem({
  s,
  esAdmin,
  onResponder,
  onPagar,
}: {
  s: SolicitudFuncion;
  esAdmin: boolean;
  onResponder: (s: SolicitudFuncion, costo: number, texto: string) => Promise<void>;
  onPagar: (s: SolicitudFuncion) => Promise<void>;
}) {
  const [costo, setCosto] = useState(String(s.costo || ""));
  const [texto, setTexto] = useState("");

  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{s.titulo}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ETIQUETA[s.estado].clase}`}>
          {ETIQUETA[s.estado].texto}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{s.descripcion}</p>

      {esAdmin && s.estado === "abierta" && (
        <div className="mt-3 rounded-lg bg-muted/60 p-3">
          <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
            <input
              aria-label="Costo"
              type="number"
              min={0}
              placeholder="Costo USD"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              aria-label="Respuesta"
              placeholder="Respuesta para el cliente…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <Button
            variant="accent"
            size="sm"
            className="mt-3"
            disabled={!texto.trim()}
            onClick={() => void onResponder(s, Number(costo || 0), texto.trim())}
          >
            Responder con costo
          </Button>
        </div>
      )}

      {s.estado === "respondida" && (
        <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
          <p className="font-semibold">Respuesta del equipo: ${s.costo} USD</p>
          <p className="mt-1 text-muted-foreground">{s.respuestaAdmin}</p>
          {!esAdmin && (
            <Button variant="accent" size="sm" className="mt-3" onClick={() => void onPagar(s)}>
              Aceptar y pagar ${s.costo} USD
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
