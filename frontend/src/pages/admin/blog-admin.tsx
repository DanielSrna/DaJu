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
  Newspaper,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import type { Publicacion, PublicacionInput } from "@/lib/api/tipos";

const SECCIONES = ["inicio", "productos", "faq", "postventa"] as const;

function slugDe(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Blog admin: listado + formulario (/:id edita). */
export function BlogAdmin() {
  const { id } = useParams<{ id?: string }>();
  return id ? <FormularioBlog id={id} /> : <ListaBlog />;
}

function ListaBlog() {
  const [items, setItems] = useState<Publicacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Publicacion | null>(null);

  const cargar = (): void => {
    setItems(null);
    setError(null);
    api
      .publicaciones()
      .then((r) => setItems(r.publicaciones))
      .catch(() => setError("No pudimos cargar el blog."));
  };

  useEffect(cargar, []);

  const alternar = async (p: Publicacion): Promise<void> => {
    try {
      await api.actualizarPublicacion(p.id, { publicado: !p.publicado });
      cargar();
    } catch {
      setError("No se pudo cambiar el estado.");
    }
  };

  const eliminar = async (p: Publicacion): Promise<void> => {
    try {
      await api.eliminarPublicacion(p.id);
      setConfirmando(null);
      cargar();
    } catch {
      setError("No se pudo eliminar.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primario)] hover:underline">
        <ArrowLeft className="size-4" /> Administración
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Blog</h1>
        <Button asChild variant="accent">
          <Link to="/admin/blog/nuevo">
            <Plus className="size-4" /> Nueva entrada
          </Link>
        </Button>
      </div>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!items ? (
        <p className="mt-6 text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Aún no hay entradas.</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((p) => (
            <article key={p.id} className={`flex flex-col rounded-xl border bg-card p-4 shadow-sm ${p.publicado ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {p.tipo === "noticia" ? <Newspaper className="size-3.5" /> : <BookOpen className="size-3.5" />}
                    {p.tipo}
                  </p>
                  <h2 className="mt-1 font-bold">{p.titulo}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.resumen}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{p.secciones.join(", ") || "sin sección"}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold">{p.publicado ? "Publicada" : "Borrador"}</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to={`/admin/blog/${p.id}`}><Pencil className="size-3.5" /> Editar</Link>
                </Button>
                <Button variant="outline" size="sm" aria-label={p.publicado ? "Despublicar" : "Publicar"} onClick={() => void alternar(p)}>
                  {p.publicado ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
                <Button variant="outline" size="sm" className="text-red-600" aria-label="Eliminar" onClick={() => setConfirmando(p)}>
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
            <h3 className="font-bold">¿Eliminar "{confirmando.titulo}"?</h3>
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

function FormularioBlog({ id }: { id: string }) {
  const navegar = useNavigate();
  const editando = id !== "nuevo";
  const [form, setForm] = useState<PublicacionInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!editando) {
      setForm({
        titulo: "",
        slug: "",
        tipo: "concepto",
        resumen: "",
        contenido: "",
        secciones: ["inicio"],
        publicado: false,
      });
      return;
    }
    let activo = true;
    api
      .publicaciones()
      .then((r) => {
        if (!activo) return;
        const p = r.publicaciones.find((x) => x.id === id);
        if (!p) return;
        setForm({
          titulo: p.titulo,
          slug: p.slug,
          tipo: p.tipo,
          resumen: p.resumen,
          contenido: p.contenido,
          secciones: p.secciones,
          publicado: p.publicado,
        });
      })
      .catch(() => setError("No se pudo cargar."));
    return () => {
      activo = false;
    };
  }, [id, editando]);

  const set = <K extends keyof PublicacionInput>(k: K, v: PublicacionInput[K]): void =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const enviar = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form) return;
    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        await api.actualizarPublicacion(id, form);
      } else {
        await api.crearPublicacion(form);
      }
      navegar("/admin/blog");
    } catch {
      setError("No se pudo guardar. Revisa los campos.");
    } finally {
      setGuardando(false);
    }
  };

  if (!form) return <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Cargando…</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/admin/blog" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primario)] hover:underline">
        <ArrowLeft className="size-4" /> Volver al blog
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{editando ? "Editar entrada" : "Nueva entrada"}</h1>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={(e) => void enviar(e)} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Título
            <input
              type="text"
              required
              aria-label="Título"
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              onBlur={() => {
                if (!editando && !form.slug) set("slug", slugDe(form.titulo));
              }}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
            />
          </label>
          <label className="block text-sm font-medium">
            Slug (URL)
            <input
              type="text"
              aria-label="Slug"
              value={form.slug ?? ""}
              onChange={(e) => set("slug", slugDe(e.target.value))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Tipo
            <select
              aria-label="Tipo"
              value={form.tipo}
              onChange={(e) => set("tipo", e.target.value as PublicacionInput["tipo"])}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
            >
              <option value="concepto">Concepto</option>
              <option value="noticia">Noticia</option>
            </select>
          </label>
          <fieldset className="text-sm font-medium">
            <legend className="mb-1">Secciones de la vitrina</legend>
            <div className="flex flex-wrap gap-3">
              {SECCIONES.map((s) => (
                <label key={s} className="inline-flex items-center gap-1.5 font-normal">
                  <input
                    type="checkbox"
                    aria-label={`Sección ${s}`}
                    checked={(form.secciones ?? []).includes(s)}
                    onChange={(e) => {
                      const actual = form.secciones ?? [];
                      set(
                        "secciones",
                        e.target.checked ? [...actual, s] : actual.filter((x) => x !== s),
                      );
                    }}
                    className="size-4 accent-[var(--brand-acento)]"
                  />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <label className="block text-sm font-medium">
          Resumen (aparece en las tarjetas)
          <input
            type="text"
            required
            aria-label="Resumen"
            value={form.resumen}
            onChange={(e) => set("resumen", e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>

        <label className="block text-sm font-medium">
          Contenido (separa párrafos con una línea en blanco; las líneas sueltas se convierten en subtítulos)
          <textarea
            rows={12}
            required
            aria-label="Contenido"
            value={form.contenido}
            onChange={(e) => set("contenido", e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            aria-label="Publicado"
            checked={form.publicado ?? false}
            onChange={(e) => set("publicado", e.target.checked)}
            className="size-4 accent-[var(--brand-acento)]"
          />
          Publicada en la vitrina
        </label>

        <div className="flex gap-2">
          <Button type="submit" variant="accent" disabled={guardando}>
            <Save className="size-4" />
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear entrada"}
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/blog">
              <X className="size-4" /> Cancelar
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
