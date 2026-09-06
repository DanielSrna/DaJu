import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import type { Oferta, OfertaInput } from "@/lib/api/tipos";

const NOMBRE_TIPO = {
  plantilla: "Plantillas",
  consultoria: "Servicios",
} as const;

const ETIQUETA_TIPO = {
  plantilla: "plantilla",
  consultoria: "servicio",
} as const;

/** Listado + formulario de ofertas (plantillas/servicios). Si hay :id se edita. */
export function OfertasAdmin({ tipo: tipoProp }: { tipo?: "plantilla" | "consultoria" }) {
  const { tipo: tipoParam, id } = useParams<{ tipo?: "plantilla" | "consultoria"; id?: string }>();
  const tipo = tipoProp ?? tipoParam;

  if (!tipo || !(tipo in NOMBRE_TIPO)) return null;

  return id ? (
    <FormularioOferta tipo={tipo} id={id} />
  ) : (
    <ListaOfertas tipo={tipo} />
  );
}

function ListaOfertas({ tipo }: { tipo: "plantilla" | "consultoria" }) {
  const [ofertas, setOfertas] = useState<Oferta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Oferta | null>(null);

  const cargar = (): void => {
    setOfertas(null);
    setError(null);
    api
      .ofertasAdmin()
      .then((r) => setOfertas(r.ofertas.filter((o) => o.tipo === tipo)))
      .catch(() => setError("No pudimos cargar las ofertas."));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const alternar = async (o: Oferta): Promise<void> => {
    try {
      await api.actualizarOferta(o.id, { activo: !o.activo });
      cargar();
    } catch {
      setError("No se pudo cambiar el estado.");
    }
  };

  const eliminar = async (o: Oferta): Promise<void> => {
    try {
      await api.eliminarOferta(o.id);
      setConfirmando(null);
      cargar();
    } catch {
      setError("No se pudo eliminar.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primario)] hover:underline">
        <ArrowLeft className="size-4" />
        Administración
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{NOMBRE_TIPO[tipo]}</h1>
        <Button asChild variant="accent">
          <Link to={`/admin/ofertas/${tipo}/nuevo`}>
            <Plus className="size-4" />
            Nueva {ETIQUETA_TIPO[tipo]}
          </Link>
        </Button>
      </div>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!ofertas ? (
        <p className="mt-6 text-muted-foreground">Cargando…</p>
      ) : ofertas.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No hay {NOMBRE_TIPO[tipo].toLowerCase()} todavía.</p>
      ) : (
        <div className={`mt-6 grid gap-4 ${tipo === "plantilla" ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
          {ofertas.map((o) => (
            <article key={o.id} className={`flex flex-col rounded-xl border bg-card p-4 shadow-sm ${o.activo ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold">{o.nombre}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{o.descripcion}</p>
                  {o.desde != null && <p className="mt-2 text-sm font-bold text-[var(--brand-primario)]">Desde ${o.desde.toLocaleString("es-CO")}</p>}
                  {o.para && <p className="mt-2 text-xs text-muted-foreground">{o.para}</p>}
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {o.activo ? "Activa" : "Oculta"}
                </span>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to={`/admin/ofertas/${tipo}/${o.id}`}>
                    <Pencil className="size-3.5" /> Editar
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => void alternar(o)} aria-label={o.activo ? "Desactivar" : "Activar"}>
                  {o.activo ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
                <Button variant="outline" size="sm" className="text-red-600" onClick={() => setConfirmando(o)} aria-label="Eliminar">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-lg border bg-background p-5">
            <h3 className="font-bold">¿Eliminar "{confirmando.nombre}"?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Permanente e irreversible.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmando(null)}>Cancelar</Button>
              <Button variant="accent" size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => void eliminar(confirmando)}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormularioOferta({ tipo, id }: { tipo: "plantilla" | "consultoria"; id: string }) {
  const navegar = useNavigate();
  const [oferta, setOferta] = useState<Oferta | null>(null);
  const [form, setForm] = useState<OfertaInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const editando = id !== "nuevo";

  useEffect(() => {
    if (!editando) {
      setForm({
        tipo,
        nombre: "",
        descripcion: "",
        features: [],
        desde: null,
        para: "",
        activo: true,
      });
      return;
    }
    let activo = true;
    api
      .ofertasAdmin()
      .then((r) => {
        if (!activo) return;
        const o = r.ofertas.find((x) => x.id === id);
        if (!o) return;
        setOferta(o);
        setForm({
          tipo: o.tipo,
          nombre: o.nombre,
          descripcion: o.descripcion,
          features: o.features,
          desde: o.desde,
          para: o.para,
          activo: o.activo,
        });
      })
      .catch(() => setError("No se pudo cargar."));
    return () => {
      activo = false;
    };
  }, [id, editando, tipo]);

  const set = <K extends keyof OfertaInput>(k: K, v: OfertaInput[K]): void =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const enviar = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form) return;
    setGuardando(true);
    setError(null);
    try {
      if (editando && oferta) {
        await api.actualizarOferta(oferta.id, form);
      } else {
        await api.crearOferta(form);
      }
      navegar(`/admin/ofertas/${tipo}`);
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  if (!form) return <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Cargando…</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to={`/admin/ofertas/${tipo}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primario)] hover:underline">
        <ArrowLeft className="size-4" /> Volver
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {editando ? `Editar ${ETIQUETA_TIPO[tipo]}` : `Nueva ${ETIQUETA_TIPO[tipo]}`}
      </h1>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={(e) => void enviar(e)} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          Nombre
          <input
            type="text"
            required
            aria-label="Nombre"
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>
        <label className="block text-sm font-medium">
          Descripción
          <textarea
            required
            rows={3}
            aria-label="Descripción"
            value={form.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>

        {tipo === "plantilla" ? (
          <>
            <label className="block text-sm font-medium">
              Precio "desde"
              <input
                type="number"
                min={0}
                aria-label="Precio desde"
                value={form.desde ?? ""}
                onChange={(e) => set("desde", e.target.value ? Number(e.target.value) : null)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
              />
            </label>
            <label className="block text-sm font-medium">
              Características (una por línea)
              <textarea
                rows={3}
                aria-label="Características"
                value={(form.features ?? []).join("\n")}
                onChange={(e) => set("features", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
              />
            </label>
          </>
        ) : (
          <label className="block text-sm font-medium">
            Para quién
            <input
              type="text"
              aria-label="Para quién"
              value={form.para ?? ""}
              onChange={(e) => set("para", e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
            />
          </label>
        )}

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            aria-label="Activo"
            checked={form.activo ?? true}
            onChange={(e) => set("activo", e.target.checked)}
            className="size-4 accent-[var(--brand-acento)]"
          />
          Activa en la vitrina
        </label>

        <div className="flex gap-2">
          <Button type="submit" variant="accent" disabled={guardando}>
            <Save className="size-4" />
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear"}
          </Button>
          <Button asChild variant="outline">
            <Link to={`/admin/ofertas/${tipo}`}>
              <X className="size-4" />
              Cancelar
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
