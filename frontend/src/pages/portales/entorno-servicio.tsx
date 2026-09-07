import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Clock, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavEntorno } from "@/components/portal/nav-entorno";
import { api } from "@/lib/api/cliente";
import type { EspacioPortal } from "@/lib/api/tipos";

/** Resumen del entorno de servicios/consultoría. */
export function EntornoServicio() {
  const { id } = useParams<{ id: string }>();
  const [espacio, setEspacio] = useState<EspacioPortal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = (): void => {
    if (!id) return;
    api.espacio(id).then((r) => setEspacio(r.espacio)).catch(() => setError("No pudimos cargar tu espacio."));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error && !espacio) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">{error}</p>
      </div>
    );
  }
  if (!espacio) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-muted-foreground">Cargando tu consultoría…</p>
      </div>
    );
  }

  const disponibles = (espacio.sesiones.total ?? 0) - (espacio.sesiones.usadas ?? 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/cliente")}>
        <ArrowLeft className="size-4" /> Volver al portal
      </Button>
      <div className="mt-3 flex items-center gap-2">
        <CalendarClock className="size-6 text-[var(--brand-acento)]" />
        <h1 className="text-2xl font-bold">Tu consultoría</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Propón franjas, el equipo confirma la cita y cada sesión realizada
        descuenta una de tu compra.
      </p>

      <NavEntorno familia="servicio" id={id ?? ""} activo="resumen" />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Video className="size-3.5" /> Canal / duración
          </p>
          <p className="mt-1 font-bold">Meet · 60 min</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> Sesiones disponibles
          </p>
          <p className="mt-1 font-bold">{disponibles} de {espacio.sesiones.total}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" /> Sesiones usadas
          </p>
          <p className="mt-1 font-bold">{espacio.sesiones.usadas}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link to={`/cliente/servicios/${id}/citas`} className="rounded-xl border p-5 transition-colors hover:border-[var(--brand-acento)]/60">
          <h2 className="font-bold">Citas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Propón franjas y mira el estado de cada sesión.</p>
        </Link>
        <Link to={`/cliente/servicios/${id}/chat`} className="rounded-xl border p-5 transition-colors hover:border-[var(--brand-acento)]/60">
          <h2 className="font-bold">Chat del entorno</h2>
          <p className="mt-1 text-sm text-muted-foreground">Contexto de tu consulta o material de referencia.</p>
        </Link>
      </div>
    </div>
  );
}
