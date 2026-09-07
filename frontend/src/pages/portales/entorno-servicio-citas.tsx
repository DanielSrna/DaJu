import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavEntorno } from "@/components/portal/nav-entorno";
import { PanelChat } from "@/components/portal/panel-chat";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";
import type { CitaPortal } from "@/lib/api/tipos";

const ESTADO: Record<CitaPortal["estado"], { texto: string; clase: string }> = {
  propuesta: { texto: "En propuesta", clase: "bg-muted text-muted-foreground" },
  confirmada: { texto: "Confirmada", clase: "bg-green-100 text-green-700" },
  realizada: { texto: "Realizada", clase: "bg-[var(--brand-primario)] text-white" },
  cancelada: { texto: "Cancelada", clase: "bg-red-100 text-red-700" },
};

function fechaLocal(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Citas de consultoría: cliente propone/cancela; admin confirma y realiza. */
export function EntornoServicioCitas() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useModoEdicion();
  const esAdmin = usuario?.rol === "admin";
  const [citas, setCitas] = useState<CitaPortal[] | null>(null);
  const [slot1Fecha, setSlot1Fecha] = useState("");
  const [slot1Hora, setSlot1Hora] = useState("");
  const [slot2Fecha, setSlot2Fecha] = useState("");
  const [slot2Hora, setSlot2Hora] = useState("");

  const diasProximos: Array<{ valor: string; etiqueta: string }> = [];
  for (let d = 1; d <= 14; d += 1) {
    const f = new Date(Date.now() + d * 86_400_000);
    diasProximos.push({
      valor: `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`,
      etiqueta: f.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" }),
    });
  }
  const horasSlot = Array.from({ length: 9 }, (_, i) => String(i + 9).padStart(2, "0") + ":00");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = (): void => {
    if (!id) return;
    api.citas(id).then((r) => setCitas(r.citas)).catch(() => setCitas([]));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const proponer = async (): Promise<void> => {
    if (!id) return;
    const propuestas = [
      slot1Fecha && slot1Hora ? new Date(`${slot1Fecha}T${slot1Hora}:00`).toISOString() : "",
      slot2Fecha && slot2Hora ? new Date(`${slot2Fecha}T${slot2Hora}:00`).toISOString() : "",
    ].filter(Boolean);
    if (!propuestas.length) {
      setError("Elige al menos una fecha y hora para tu cita.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await api.proponerCita(id, {
        propuestas: propuestas.map((f) => new Date(f).toISOString()),
        duracionMin: 60,
        canal: "Meet",
      });
      setSlot1Fecha("");
      setSlot1Hora("");
      setSlot2Fecha("");
      setSlot2Hora("");
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = `/cliente/servicios/${id}`)}>
        <ArrowLeft className="size-4" /> Volver al resumen
      </Button>
      <h1 className="mt-3 text-2xl font-bold">Citas</h1>
      <NavEntorno familia="servicio" id={id ?? ""} activo="citas" />

      {!esAdmin && (
        <section className="mt-6 rounded-2xl border bg-card p-6">
          <h2 className="font-bold">Proponer una cita</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige 1 o 2 franjas (tu zona horaria); el equipo confirma la mejor.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Opción 1</p>
              <label className="mt-2 block text-xs font-medium">
                Fecha
                <select
                  aria-label="Franja 1 · fecha"
                  value={slot1Fecha}
                  onChange={(e) => setSlot1Fecha(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                >
                  <option value="">Elegir…</option>
                  {diasProximos.map((d) => (
                    <option key={d.valor} value={d.valor}>{d.etiqueta}</option>
                  ))}
                </select>
              </label>
              <label className="mt-2 block text-xs font-medium">
                Hora
                <select
                  aria-label="Franja 1 · hora"
                  value={slot1Hora}
                  onChange={(e) => setSlot1Hora(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                >
                  <option value="">Elegir…</option>
                  {horasSlot.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Opción 2 (opcional)</p>
              <label className="mt-2 block text-xs font-medium">
                Fecha
                <select
                  aria-label="Franja 2 · fecha"
                  value={slot2Fecha}
                  onChange={(e) => setSlot2Fecha(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                >
                  <option value="">Elegir…</option>
                  {diasProximos.map((d) => (
                    <option key={d.valor} value={d.valor}>{d.etiqueta}</option>
                  ))}
                </select>
              </label>
              <label className="mt-2 block text-xs font-medium">
                Hora
                <select
                  aria-label="Franja 2 · hora"
                  value={slot2Hora}
                  onChange={(e) => setSlot2Hora(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                >
                  <option value="">Elegir…</option>
                  {horasSlot.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <Button variant="accent" className="mt-4" disabled={enviando} onClick={() => void proponer()}>
            {enviando ? "Enviando…" : "Enviar propuesta"}
          </Button>
        </section>
      )}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-8 space-y-3">
        {!citas
          ? <p className="text-sm text-muted-foreground">Cargando citas…</p>
          : citas.length === 0
            ? <p className="text-sm text-muted-foreground">Aún no hay citas.</p>
            : citas.map((c) => <CitaItem key={c.id} cita={c} esAdmin={esAdmin} onCambiar={cargar} />)}
      </div>
    </div>
  );
}

function CitaItem({
  cita,
  esAdmin,
  onCambiar,
}: {
  cita: CitaPortal;
  esAdmin: boolean;
  onCambiar: () => void;
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  const confirmar = async (): Promise<void> => {
    if (!confirmando) return;
    try {
      await api.confirmarCita(cita.id, { franja: new Date(confirmando).toISOString(), linkVideollamada: link });
      onCambiar();
    } catch {
      setError("No se pudo confirmar (¿la franja está ocupada?).");
    }
  };

  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Sesión {cita.sesion}</h3>
          <p className="text-xs text-muted-foreground">
            {fechaLocal(cita.confirmada)} por {cita.canal}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO[cita.estado].clase}`}>
            {ESTADO[cita.estado].texto}
          </span>
          {esAdmin && cita.estado === "propuesta" && (
            <Button size="sm" variant="outline" onClick={() => setConfirmando((v) => (v ? null : cita.propuestas[0] ?? null))}>
              {confirmando ? "Quitar selección" : "Confirmar"}
            </Button>
          )}
          {(cita.estado === "propuesta" || cita.estado === "confirmada") && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600"
              onClick={() => void api.cancelarCita(cita.id).then(onCambiar)}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {cita.propuestas.map((p) => {
          const activa = confirmando === p;
          return (
            <button
              key={p}
              type="button"
              {...(esAdmin && cita.estado === "propuesta" ? { onClick: () => setConfirmando(p) } : {})}
              className={`rounded-full px-2.5 py-1 text-xs ${
                activa ? "bg-[var(--brand-acento)] text-[var(--brand-primario)]" : "bg-muted"
              }`}
            >
              Propuesta: {fechaLocal(p)}
            </button>
          );
        })}
      </div>
      {confirmando && esAdmin && cita.estado === "propuesta" && (
        <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
          <input
            aria-label="Link de videollamada"
            placeholder="https://meet.google.com/…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <Button variant="accent" size="sm" className="mt-2" onClick={() => void confirmar()}>
            Confirmar esta franja
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {esAdmin && cita.estado === "confirmada" && (
        <Button size="sm" className="mt-2" onClick={() => void api.realizarCita(cita.id).then(onCambiar)}>
          Marcar realizada (consume sesión)
        </Button>
      )}
      {cita.linkVideollamada && (
        <a href={cita.linkVideollamada} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primario)] underline underline-offset-4">
          Abrir videollamada
        </a>
      )}
    </article>
  );
}

/** Chat del entorno de servicios. */
export function EntornoServicioChat() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = `/cliente/servicios/${id}`)}>
        <ArrowLeft className="size-4" /> Volver al resumen
      </Button>
      <h1 className="mt-3 text-2xl font-bold">Chat del entorno</h1>
      <NavEntorno familia="servicio" id={id ?? ""} activo="chat" />
      <div className="mt-4">
        <PanelChat contexto="espacio" contextoId={id ?? ""} alto="h-80" />
      </div>
    </div>
  );
}
