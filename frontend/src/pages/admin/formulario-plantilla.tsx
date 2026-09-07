import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorTexto } from "@/components/editor/editor-texto";
import { api } from "@/lib/api/cliente";
import type { Plantilla, PlantillaInput } from "@/lib/api/tipos";

function slugificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Formulario de creación/edición de una plantilla (solo admin). */
export function FormularioPlantilla() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(slug);

  const [plantilla, setPlantilla] = useState<Plantilla | null>(null);
  const [form, setForm] = useState<PlantillaInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nuevasImagenes, setNuevasImagenes] = useState<File[]>([]);

  useEffect(() => {
    if (!slug) {
      setForm({
        nombre: "",
        slug: "",
        plataforma: "",
        descripcion: "",
        precio: 0,
        moneda: "USD",
        vistasIncluidas: 5,
        soporteMeses: 3,
        diasEntrega: 20,
        features: [],
        detalles: [],
        activo: true,
      });
      return;
    }
    let activo = true;
    api
      .plantillaPorSlug(slug)
      .then((r) => {
        if (!activo) return;
        const p = r.plantilla;
        setPlantilla(p);
        setForm({
          nombre: p.nombre,
          slug: p.slug,
          plataforma: p.plataforma,
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
      .catch(() => setError("No se pudo cargar la plantilla."));
    return () => {
      activo = false;
    };
  }, [slug]);

  const set = <K extends keyof PlantillaInput>(
    k: K,
    v: PlantillaInput[K],
  ): void => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  const enviar = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form) return;
    setGuardando(true);
    setError(null);
    try {
      if (editando && plantilla) {
        const actualizada = await api.actualizarPlantilla(plantilla.id, form);
        for (const file of nuevasImagenes) {
          await api.subirImagenGaleriaPlantilla(actualizada.plantilla.id, file);
        }
        navigate("/admin/plantillas");
      } else {
        const creada = await api.crearPlantilla(form);
        for (const file of nuevasImagenes) {
          await api.subirImagenGaleriaPlantilla(creada.plantilla.id, file);
        }
        navigate("/admin/plantillas");
      }
    } catch {
      setError("No se pudo guardar la plantilla. Revisa los campos.");
    } finally {
      setGuardando(false);
    }
  };

  const subirPortada = async (file: File): Promise<void> => {
    if (!plantilla) {
      setNuevasImagenes((arr) => [file, ...arr]);
      return;
    }
    try {
      await api.subirImagenPortadaPlantilla(plantilla.id, file);
      const r = await api.plantillaPorSlug(plantilla.slug);
      setPlantilla(r.plantilla);
    } catch {
      setError("No se pudo subir la portada.");
    }
  };

  const eliminarGaleria = async (publicId: string): Promise<void> => {
    if (!plantilla) return;
    try {
      await api.eliminarImagenGaleriaPlantilla(plantilla.id, publicId);
      const r = await api.plantillaPorSlug(plantilla.slug);
      setPlantilla(r.plantilla);
    } catch {
      setError("No se pudo eliminar la imagen.");
    }
  };

  if (!form) {
    return (
      <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">
        Cargando…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        to="/admin/plantillas"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primario)] hover:underline"
      >
        <ArrowLeft className="size-4" />
        Volver a la lista
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {editando ? `Editar: ${plantilla?.nombre}` : "Nueva plantilla"}
      </h1>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={enviar} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          <span>Nombre</span>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Nombre"
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          <span>Slug</span>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Slug"
            value={form.slug}
            onChange={(e) => set("slug", slugificar(e.target.value))}
          />
        </label>
        <label className="block text-sm font-medium">
          <span>Plataforma (ej. Reservas)</span>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Plataforma"
            value={form.plataforma}
            onChange={(e) => set("plataforma", e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          <span>Precio (USD)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Precio"
            value={form.precio}
            onChange={(e) => set("precio", Number(e.target.value))}
          />
        </label>
        <label className="block text-sm font-medium">
          <span>Moneda</span>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Moneda"
            value={form.moneda}
            onChange={(e) => set("moneda", e.target.value.toUpperCase().slice(0, 3))}
          />
        </label>
        <label className="block text-sm font-medium">
          <span>Vistas incluidas</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Vistas incluidas"
            value={form.vistasIncluidas}
            onChange={(e) => set("vistasIncluidas", Number(e.target.value))}
          />
        </label>
        <label className="block text-sm font-medium">
          <span>Meses de soporte</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Soporte meses"
            value={form.soporteMeses}
            onChange={(e) => set("soporteMeses", Number(e.target.value))}
          />
        </label>
        <label className="block text-sm font-medium">
          <span>Días de entrega</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Días de entrega"
            value={form.diasEntrega}
            onChange={(e) => set("diasEntrega", Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            aria-label="Activo"
            checked={form.activo ?? true}
            onChange={(e) => set("activo", e.target.checked)}
          />
          Publicada en la vitrina
        </label>

        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Descripción</span>
          <EditorTexto
            html={form.descripcion}
            onChange={(html) => set("descripcion", html)}
            textoAcuerdo="Describe qué resuelve esta plantilla y cómo se ve."
          />
        </div>

        <label className="block text-sm font-medium sm:col-span-2">
          <span>Funciones incluidas (una por línea)</span>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={4}
            aria-label="Características"
            value={(form.features ?? []).join("\n")}
            onChange={(e) =>
              set("features", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))
            }
          />
        </label>

        <label className="block text-sm font-medium sm:col-span-2">
          <span>Secciones extra del detalle (una por línea: Título: texto)</span>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={4}
            aria-label="Secciones"
            value={(form.detalles ?? [])
              .map((d) => `${d.titulo}: ${d.texto}`)
              .join("\n")}
            onChange={(e) =>
              set(
                "detalles",
                e.target.value
                  .split("\n")
                  .map((lin) => {
                    const i = lin.indexOf(":");
                    return i > 0
                      ? { titulo: lin.slice(0, i).trim(), texto: lin.slice(i + 1).trim() }
                      : { titulo: lin, texto: "" };
                  })
                  .filter((d) => d.titulo),
              )
            }
          />
        </label>

        {/* Imágenes */}
        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Imágenes</span>
          <div className="mt-2 flex flex-wrap gap-3">
            {plantilla?.imagen && (
              <div className="relative">
                <img
                  src={plantilla.imagen.url}
                  alt="Portada"
                  className="h-28 w-44 rounded-lg border object-cover"
                />
                <span className="absolute left-1 top-1 rounded bg-[var(--brand-primario)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Portada
                </span>
              </div>
            )}
            {plantilla?.galeria.map((g) => (
              <div key={g.publicId} className="relative">
                <img
                  src={g.url}
                  alt="Vista"
                  className="h-28 w-44 rounded-lg border object-cover"
                />
                <button
                  type="button"
                  aria-label={`Eliminar vista ${g.url.slice(-8)}`}
                  className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-red-600 text-white"
                  onClick={() => void eliminarGaleria(g.publicId)}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {plantilla ? (
              <label className="flex h-28 w-44 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:bg-muted">
                <ImagePlus className="size-5" />
                Vistas
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void subirPortada(f);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            La primera imagen subida será la portada; en edición el cursor
            "Vistas" agrega capturas (recuerda guardar antes para editarlas).
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/plantillas")}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={guardando}
            >
              <Save className="size-4" />
              {guardando ? "Guardando..." : "Guardar plantilla"}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Trash2 className="size-3.5" />
        Una vez guardada, puedes retirarla con el ojo en la lista.
      </div>
    </div>
  );
}
