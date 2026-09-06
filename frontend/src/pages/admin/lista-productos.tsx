import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, Pencil, Trash2, Eye, EyeOff, Copy } from "lucide-react";import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import type { Paquete } from "@/lib/api/tipos";

/**
 * Listado de productos (solo admin): tarjetas con acceso a editar, desactivar
 * (activo:false) y eliminar. Los inactivos se distinguen y pueden reactivarse.
 */
export function ListaProductos() {
  const [paquetes, setPaquetes] = useState<Paquete[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Paquete | null>(null);
  const [confirmacionEscribir, setConfirmacionEscribir] = useState("");

  const cargar = (): void => {
    setPaquetes(null);
    setError(null);
    api
      .paquetes()
      .then((r) => setPaquetes(r.paquetes))
      .catch(() => setError("No pudimos cargar los productos."));
  };

  useEffect(() => {
    cargar();
  }, []);

  const alternarActivo = async (p: Paquete): Promise<void> => {
    try {
      await api.actualizarPaquete(p.id, { activo: !p.activo });
      cargar();
    } catch {
      setError("No se pudo cambiar el estado del producto.");
    }
  };

  const eliminarPermanente = async (p: Paquete): Promise<void> => {
    try {
      await api.eliminarPaquete(p.id);
      setConfirmando(null);
      cargar();
    } catch {
      setError("No se pudo eliminar el producto.");
    }
  };

  const duplicar = async (p: Paquete): Promise<void> => {
    try {
      await api.crearPaquete({
        nombre: `${p.nombre} (copia)`,
        slug: `${p.slug}-copia`,
        tipo: p.tipo,
        descripcion: p.descripcion,
        precio: p.precio,
        moneda: p.moneda,
        vistasIncluidas: p.vistasIncluidas,
        soporteMeses: p.soporteMeses,
        diasEntrega: p.diasEntrega,
        features: p.features,
        detalles: p.detalles,
        activo: false,
      });
      cargar();
    } catch {
      setError("No se pudo duplicar el producto.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Productos administrados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea, edita, publica o retira los paquetes de la vitrina.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link to="/admin/productos/nuevo">
            <Plus className="size-4" />
            Nuevo producto
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!paquetes ? (
        <p className="mt-6 text-muted-foreground">Cargando productos…</p>
      ) : paquetes.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Aún no hay productos. Crea el primero con el botón de arriba.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paquetes.map((p) => (
            <article
              key={p.id}
              className={`flex flex-col rounded-xl border bg-card p-4 shadow-sm ${p.activo ? "" : "opacity-60"}`}
            >
              {p.imagen ? (
                <img src={p.imagen.url} alt={p.nombre} className="mb-3 aspect-[3/2] w-full rounded-lg object-cover" />
              ) : (
                <div className="mb-3 flex aspect-[3/2] w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Package className="size-8" />
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold">{p.nombre}</h2>
                  <p className="text-xs capitalize text-muted-foreground">{p.tipo}</p>
                </div>
                <span className="text-sm font-bold">${p.precio.toLocaleString("es-CO")}</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  aria-label={`Editar ${p.nombre}`}
                >
                  <Link to={`/admin/productos/${p.slug}`}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={p.activo ? `Desactivar ${p.nombre}` : `Publicar ${p.nombre}`}
                  onClick={() => void alternarActivo(p)}
                  className="gap-1"
                >
                  {p.activo ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Duplicar ${p.nombre}`}
                  onClick={() => void duplicar(p)}
                  className="gap-1"
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Eliminar ${p.nombre}`}
                  onClick={() => setConfirmando(p)}
                  className="gap-1 text-red-600"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <p className={`mt-2 text-xs ${p.activo ? "text-green-700" : "text-muted-foreground"}`}>
                {p.activo ? "Visible en la vitrina" : "Oculto de la vitrina"}
              </p>
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
              Esta acción es permanente. Escribe <strong>ELIMINAR</strong> para confirmar.
            </p>
            <input
              type="text"
              aria-label="Confirmar eliminar"
              placeholder="ELIMINAR"
              value={confirmacionEscribir}
              onChange={(e) => setConfirmacionEscribir(e.target.value)}
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfirmando(null);
                  setConfirmacionEscribir("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="accent"
                size="sm"
                className="bg-red-600 hover:bg-red-700 disabled:opacity-40"
                disabled={confirmacionEscribir !== "ELIMINAR"}
                onClick={() => void eliminarPermanente(confirmando)}
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
