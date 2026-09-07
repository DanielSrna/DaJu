import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Blocks, CheckCircle2, History, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import type { ResumenPortal } from "@/lib/api/tipos";

const ESTADOS = ["recibido", "diseno", "desarrollo", "entregado"];
const ETIQUETA: Record<string, string> = {
  recibido: "Recibido",
  diseno: "Diseño",
  desarrollo: "Desarrollo",
  entregado: "Entregado",
};

interface ProyectoRow {
  id: string;
  cliente: { nombre: string; email: string };
  paquete: { nombre: string; slug: string; tipo: string; soporteMeses: number };
  estado: string;
  fechaEntrega: string;
}

/** Centro de administración: TODOS los proyectos (paquetes, plantillas y servicios). */
export function CentroProyectos() {
  const [proyectos, setProyectos] = useState<ProyectoRow[] | null>(null);
  const [entornos, setEntornos] = useState<ResumenPortal | null>(null);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [moviedo, setMoviedo] = useState<string | null>(null);

  const cargar = (): void => {
    api
      .proyectosAdmin({ estado: filtro || undefined })
      .then((r) => setProyectos(r.proyectos))
      .catch(() => setError("No pudimos cargar los proyectos."));
    api
      .resumenPortal()
      .then(setEntornos)
      .catch(() => null);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const mover = async (p: ProyectoRow, estado: string): Promise<void> => {
    setMoviedo(p.id);
    setError(null);
    try {
      await api.moverEstadoProyecto(p.id, estado);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMoviedo(null);
    }
  };

  const plantillas = entornos?.espacios.filter((e) => e.tipoProducto === "plantilla") ?? [];
  const servicios = entornos?.espacios.filter((e) => e.tipoProducto === "servicio") ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/cliente")}>
        <ArrowLeft className="size-4" /> Volver al portal
      </Button>
      <h1 className="mt-3 text-2xl font-bold">Centro de proyectos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todos los entornos de los clientes: paquetes, plantillas y consultoría.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium">Filtrar paquetes por estado:</label>
        {["", ...ESTADOS].map((e) => (
          <button
            key={e || "todos"}
            type="button"
            onClick={() => setFiltro(e)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              filtro === e ? "border-[var(--brand-acento)] bg-[var(--brand-acento)]/15" : "hover:bg-muted"
            }`}
          >
            {e ? ETIQUETA[e] : "Todos"}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* ================= PAQUETES ================= */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Layers className="size-5 text-[var(--brand-acento)]" /> Paquetes ({proyectos?.length ?? 0})
        </h2>
        <div className="mt-3 space-y-3">
          {!proyectos ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : proyectos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin proyectos de paquetes{filtro ? ` en "${ETIQUETA[filtro]}"` : ""}.</p>
          ) : (
            proyectos.map((p) => {
              const idx = ESTADOS.indexOf(p.estado);
              const siguiente = idx >= 0 && idx < ESTADOS.length - 1 ? ESTADOS[idx + 1] : null;
              return (
                <article key={p.id} className="rounded-xl border p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-2 font-bold">
                        {p.paquete.nombre}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                          {p.cliente.nombre}
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Entrega: {new Date(p.fechaEntrega).toLocaleDateString("es-CO")} · Soporte {p.paquete.soporteMeses} meses
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--brand-primario)]/[0.08] px-2.5 py-1 text-xs font-semibold text-[var(--brand-primario)]">
                      {ETIQUETA[p.estado] ?? p.estado}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {ESTADOS.map((estado) => (
                      <span
                        key={estado}
                        className={`text-xs font-semibold ${
                          estado === p.estado
                            ? "text-[var(--brand-primario)]"
                            : ESTADOS.indexOf(estado) < idx
                              ? "text-green-700"
                              : "text-muted-foreground/50"
                        }`}
                      >
                        {estado === p.estado ? `● ${ETIQUETA[estado]}` : ETIQUETA[estado]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {siguiente && (
                      <Button
                        variant="accent"
                        size="sm"
                        disabled={moviedo === p.id}
                        onClick={() => void mover(p, siguiente)}
                      >
                        <ArrowRight className="size-3.5" />
                        {moviedo === p.id ? "Moviendo…" : `Pasar a ${ETIQUETA[siguiente]}`}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (window.location.href = `/cliente/paquetes/${p.id}`)}
                    >
                      <History className="size-3.5" /> Ir al entorno
                    </Button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* ================= PLANTILLAS ================= */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Blocks className="size-5 text-[var(--brand-acento)]" /> Plantillas ({plantillas.length})
        </h2>
        {!entornos ? (
          <p className="mt-3 text-sm text-muted-foreground">Cargando…</p>
        ) : plantillas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sin entornos de plantillas.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {plantillas.map((e) => (
              <article key={e.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold capitalize">{e.productoSlug}</h3>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{e.clienteNombre}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => (window.location.href = `/cliente/plantillas/${e.id}`)}
                >
                  <History className="size-3.5" /> Ir al entorno
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ================= SERVICIOS ================= */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <CheckCircle2 className="size-5 text-[var(--brand-acento)]" /> Consultoría ({servicios.length})
        </h2>
        {!entornos ? (
          <p className="mt-3 text-sm text-muted-foreground">Cargando…</p>
        ) : servicios.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sin entornos de consultoría.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {servicios.map((e) => (
              <article key={e.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold capitalize">{e.productoSlug}</h3>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{e.clienteNombre}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Sesiones: {e.sesiones.usadas}/{e.sesiones.total} usadas
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => (window.location.href = `/cliente/servicios/${e.id}`)}
                >
                  <History className="size-3.5" /> Ir al entorno
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
