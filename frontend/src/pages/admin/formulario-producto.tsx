import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorTexto } from "@/components/editor/editor-texto";
import { api } from "@/lib/api/cliente";
import type { Paquete, PaqueteInput } from "@/lib/api/tipos";

const TIPOS: PaqueteInput["tipo"][] = ["validor", "corporativo", "operativo"];

function slugificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Formulario de creación/edición de un paquete (solo admin). */
export function FormularioProducto() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(slug);

  const [paquete, setPaquete] = useState<Paquete | null>(null);
  const [form, setForm] = useState<PaqueteInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nuevasImagenes, setNuevasImagenes] = useState<File[]>([]);

  useEffect(() => {
    if (!slug) {
      // Crear: valores por defecto limpios
      setForm({
        nombre: "",
        slug: "",
        tipo: "validor",
        descripcion: "",
        precio: 0,
        moneda: "USD",
        vistasIncluidas: 1,
        soporteMeses: 2,
        diasEntrega: 10,
        features: [],
        detalles: [],
        activo: true,
      });
      return;
    }
    let activo = true;
    api
      .paquetePorSlug(slug)
      .then((r) => {
        if (!activo) return;
        const p = r.paquete;
        setPaquete(p);
        setForm({
          nombre: p.nombre,
          slug: p.slug,
          tipo: p.tipo,
          descripcion: p.descripcion,
          precio: p.precio,
          moneda: p.moneda,
          vistasIncluidas: p.vistasIncluidas,
          soporteMeses: p.soporteMeses,
          diasEntrega: p.diasEntrega,
          features: p.features,
          detalles: p.detalles,
          activo: p.activo,
        });
      })
      .catch(() => setError("No se pudo cargar el producto."));
    return () => {
      activo = false;
    };
  }, [slug]);

  const set = <K extends keyof PaqueteInput>(k: K, v: PaqueteInput[K]): void => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  const enviar = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form) return;
    setGuardando(true);
    setError(null);
    try {
      if (editando && paquete) {
        const actualizado = await api.actualizarPaquete(paquete.id, form);
        // Subir imágenes nuevas si hay
        for (const file of nuevasImagenes) {
          await api.subirImagenGaleria(actualizado.paquete.id, file);
        }
        navigate("/admin/productos");
      } else {
        const creado = await api.crearPaquete(form);
        for (const file of nuevasImagenes) {
          await api.subirImagenGaleria(creado.paquete.id, file);
        }
        navigate("/admin/productos");
      }
    } catch {
      setError("No se pudo guardar el producto. Revisa los campos.");
    } finally {
      setGuardando(false);
    }
  };

  const subirPortada = async (file: File): Promise<void> => {
    if (!paquete) {
      setNuevasImagenes((arr) => [file, ...arr]);
      return;
    }
    try {
      await api.subirImagenPortada(paquete.id, file);
      const r = await api.paquetePorSlug(paquete.slug);
      setPaquete(r.paquete);
    } catch {
      setError("No se pudo subir la portada.");
    }
  };

  const eliminarGaleria = async (publicId: string): Promise<void> => {
    if (!paquete) return;
    try {
      await api.eliminarImagenGaleria(paquete.id, publicId);
      const r = await api.paquetePorSlug(paquete.slug);
      setPaquete(r.paquete);
    } catch {
      setError("No se pudo eliminar la imagen.");
    }
  };

  if (!form) {
    return <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/admin/productos" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primario)] hover:underline">
        <ArrowLeft className="size-4" />
        Volver a la lista
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {editando ? `Editar: ${paquete?.nombre}` : "Nuevo producto"}
      </h1>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={(e) => void enviar(e)} className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Nombre
          <input
            type="text"
            required
            aria-label="Nombre"
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            onBlur={() => {
              if (!editando && !form.slug) set("slug", slugificar(form.nombre));
            }}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>
        <label className="block text-sm font-medium">
          Slug (URL)
          <input
            type="text"
            required
            aria-label="Slug"
            value={form.slug}
            onChange={(e) => set("slug", slugificar(e.target.value))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>

        <label className="block text-sm font-medium">
          Tipo
          <select
            aria-label="Tipo"
            value={form.tipo}
            onChange={(e) => set("tipo", e.target.value as PaqueteInput["tipo"])}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Precio
          <input
            type="number"
            min={0}
            required
            aria-label="Precio"
            value={form.precio}
            onChange={(e) => set("precio", Number(e.target.value))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>
        <label className="block text-sm font-medium">
          Moneda
          <select
            aria-label="Moneda"
            value={form.moneda}
            onChange={(e) => set("moneda", e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          >
            <option value="USD">USD</option>
            <option value="COP">COP</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Vistas incluidas
          <input
            type="number"
            min={1}
            required
            aria-label="Vistas incluidas"
            value={form.vistasIncluidas}
            onChange={(e) => set("vistasIncluidas", Number(e.target.value))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>
        <label className="block text-sm font-medium">
          Soporte (meses)
          <input
            type="number"
            min={1}
            required
            aria-label="Soporte meses"
            value={form.soporteMeses}
            onChange={(e) => set("soporteMeses", Number(e.target.value))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>
        <label className="block text-sm font-medium">
          Días de entrega
          <input
            type="number"
            min={1}
            required
            aria-label="Días de entrega"
            value={form.diasEntrega}
            onChange={(e) => set("diasEntrega", Number(e.target.value))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            aria-label="Activo"
            checked={form.activo ?? true}
            onChange={(e) => set("activo", e.target.checked)}
            className="size-4 accent-[var(--brand-acento)]"
          />
          Publicado en la vitrina
        </label>

        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Descripción</span>
          <EditorTexto
            ariaLabel="Descripción"
            value={form.descripcion}
            onChange={(html) => set("descripcion", html)}
            rows={6}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Puedes usar títulos (H2/H3), negrita, cursiva y 3 tamaños seleccionando el texto.
          </p>
        </div>

        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Garantía</span>
          <EditorTexto
            ariaLabel="Garantía"
            value={form.garantia}
            onChange={(html) => set("garantia", html)}
            rows={5}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Texto de la garantía del producto. Misma edición: títulos, negrita, cursiva y tamaños.
          </p>
        </div>

        <label className="block text-sm font-medium sm:col-span-2">
          Características (una por línea)
          <textarea
            rows={3}
            aria-label="Características"
            value={(form.features ?? []).join("\n")}
            onChange={(e) => set("features", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>

        <label className="block text-sm font-medium sm:col-span-2">
          Detalles (título: texto — uno por línea)
          <textarea
            rows={3}
            aria-label="Detalles"
            value={(form.detalles ?? []).map((d) => `${d.titulo}: ${d.texto}`).join("\n")}
            onChange={(e) =>
              set(
                "detalles",
                e.target.value
                  .split("\n")
                  .map((linea) => {
                    const idx = linea.indexOf(":");
                    if (idx === -1) return null;
                    return { titulo: linea.slice(0, idx).trim(), texto: linea.slice(idx + 1).trim() };
                  })
                  .filter((d): d is { titulo: string; texto: string } => d !== null && d.titulo.length > 0),
              )
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>

        {/* Portada */}
        <section className="sm:col-span-2">
          <h2 className="text-sm font-bold">Portada</h2>
          {paquete?.imagen ? (
            <div className="mt-2 flex items-center gap-3">
              <img src={paquete.imagen.url} alt="Portada" className="h-24 w-40 rounded-lg object-cover" />
              <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium text-[var(--brand-primario)] hover:bg-muted">
                Cambiar portada
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Subir portada"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void subirPortada(f);
                  }}
                />
              </label>
            </div>
          ) : (
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-muted">
              <ImagePlus className="size-4" />
              Subir imagen de portada
              <input
                type="file"
                accept="image/*"
                aria-label="Subir portada"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void subirPortada(f);
                }}
              />
            </label>
          )}
        </section>

        {/* Galería */}
        <section className="sm:col-span-2">
          <h2 className="text-sm font-bold">Galería</h2>
          <div className="mt-2 flex flex-wrap gap-3">
            {paquete?.galeria.map((g) => (
              <div key={g.publicId} className="relative">
                <img src={g.url} alt="" className="h-20 w-32 rounded-lg object-cover" />
                <button
                  type="button"
                  aria-label="Eliminar imagen de galería"
                  onClick={() => void eliminarGaleria(g.publicId)}
                  className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-red-600 shadow"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
            {nuevasImagenes.map((f, i) => (
              <div key={`${f.name}-${i}`} className="rounded-lg border border-dashed p-2 text-xs text-muted-foreground">
                {f.name}
              </div>
            ))}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground hover:bg-muted">
              <ImagePlus className="size-4" />
              Agregar imagen
              <input
                type="file"
                accept="image/*"
                multiple
                aria-label="Agregar imágenes"
                className="hidden"
                onChange={(e) => {
                  const archivos = Array.from(e.target.files ?? []);
                  setNuevasImagenes((arr) => [...arr, ...archivos]);
                }}
              />
            </label>
          </div>
        </section>

        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" variant="accent" disabled={guardando}>
            <Save className="size-4" />
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear producto"}
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/productos">
              <X className="size-4" />
              Cancelar
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
