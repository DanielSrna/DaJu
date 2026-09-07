import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Code2, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import type { Servicio } from "@/lib/api/tipos";

const CATEGORIA_LABEL: Record<Servicio["categoria"], string> = {
  auditoria: "Auditoría",
  asesoria: "Asesoría",
  aceleracion: "Aceleración",
};

/** Listado de servicios de consultoría (solo admin). */
export function ListaServicios() {
  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Servicio | null>(null);

  const cargar = (): void => {
    setServicios(null);
    setError(null);
    api
      .servicios()
      .then((r) => setServicios(r.servicios))
      .catch(() => setError("No pudimos cargar los servicios."));
  };

  useEffect(() => {
    cargar();
  }, []);

  const alternarActivo = async (s: Servicio): Promise<void> => {
    try {
      await api.actualizarServicio(s.id, { activo: !s.activo });
      cargar();
    } catch {
      setError("No se pudo cambiar el estado del servicio.");
    }
  };

  const eliminar = async (s: Servicio): Promise<void> => {
    try {
      await api.eliminarServicio(s.id);
      setConfirmando(null);
      cargar();
    } catch {
      setError("No se pudo eliminar el servicio.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Servicios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultoría por sesiones: auditorías, asesorías y aceleración.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link to="/admin/servicios/nuevo">
            <Plus className="size-4" />
            Nuevo servicio
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!servicios ? (
        <p className="mt-6 text-muted-foreground">Cargando servicios…</p>
      ) : servicios.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          Aún no hay servicios. Crea el primero con el botón de arriba.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s) => (
            <article
              key={s.id}
              className={`flex flex-col rounded-xl border bg-card p-4 shadow-sm ${s.activo ? "" : "opacity-60"}`}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
                <Code2 className="size-5" />
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold">{s.nombre}</h2>
                  <p className="text-xs capitalize text-muted-foreground">
                    {CATEGORIA_LABEL[s.categoria]} · {s.canal} · {s.duracionMin} min
                  </p>
                </div>
                <span className="text-sm font-bold">
                  ${s.precio.toLocaleString("es-CO")}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to={`/admin/servicios/${s.slug}`}>
                    <Pencil className="size-3.5" /> Editar
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={s.activo ? "Desactivar" : "Activar"}
                  onClick={() => void alternarActivo(s)}
                >
                  {s.activo ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                  aria-label="Eliminar"
                  onClick={() => setConfirmando(s)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {confirmando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-lg border bg-background p-5">
            <h3 className="font-bold">¿Eliminar "{confirmando.nombre}"?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanente e irreversible.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmando(null)}>
                Cancelar
              </Button>
              <Button
                variant="accent"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => void eliminar(confirmando)}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
