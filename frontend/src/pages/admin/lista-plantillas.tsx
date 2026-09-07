import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Blocks, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import type { Plantilla } from "@/lib/api/tipos";

/** Listado de plantillas (solo admin): editar, activar/retirar y eliminar. */
export function ListaPlantillas() {
  const [plantillas, setPlantillas] = useState<Plantilla[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Plantilla | null>(null);

  const cargar = (): void => {
    setPlantillas(null);
    setError(null);
    api
      .plantillas()
      .then((r) => setPlantillas(r.plantillas))
      .catch(() => setError("No pudimos cargar las plantillas."));
  };

  useEffect(() => {
    cargar();
  }, []);

  const alternarActivo = async (p: Plantilla): Promise<void> => {
    try {
      await api.actualizarPlantilla(p.id, { activo: !p.activo });
      cargar();
    } catch {
      setError("No se pudo cambiar el estado de la plantilla.");
    }
  };

  const eliminar = async (p: Plantilla): Promise<void> => {
    try {
      await api.eliminarPlantilla(p.id);
      setConfirmando(null);
      cargar();
    } catch {
      setError("No se pudo eliminar la plantilla.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Plantillas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Soluciones web listas para desplegar: crea, edita y publica.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link to="/admin/plantillas/nuevo">
            <Plus className="size-4" />
            Nueva plantilla
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!plantillas ? (
        <p className="mt-6 text-muted-foreground">Cargando plantillas…</p>
      ) : plantillas.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          Aún no hay plantillas. Crea la primera con el botón de arriba.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plantillas.map((p) => (
            <article
              key={p.id}
              className={`flex flex-col rounded-xl border bg-card p-4 shadow-sm ${p.activo ? "" : "opacity-60"}`}
            >
              {p.imagen ? (
                <img
                  src={p.imagen.url}
                  alt={p.nombre}
                  className="mb-3 aspect-[16/9] w-full rounded-lg object-cover"
                />
              ) : (
                <div className="mb-3 flex aspect-[16/9] w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Blocks className="size-8" />
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold">{p.nombre}</h2>
                  <p className="text-xs capitalize text-muted-foreground">
                    {p.plataforma}
                  </p>
                </div>
                <span className="text-sm font-bold">
                  ${p.precio.toLocaleString("es-CO")}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to={`/admin/plantillas/${p.slug}`}>
                    <Pencil className="size-3.5" /> Editar
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={p.activo ? "Desactivar" : "Activar"}
                  onClick={() => void alternarActivo(p)}
                >
                  {p.activo ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                  aria-label="Eliminar"
                  onClick={() => setConfirmando(p)}
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
