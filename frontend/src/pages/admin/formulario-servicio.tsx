import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorTexto } from "@/components/editor/editor-texto";
import { api } from "@/lib/api/cliente";
import type { Servicio, ServicioInput } from "@/lib/api/tipos";

function slugificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Formulario de creación/edición de un servicio de consultoría (solo admin). */
export function FormularioServicio() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(slug);

  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [form, setForm] = useState<ServicioInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!slug) {
      setForm({
        nombre: "",
        slug: "",
        categoria: "asesoria",
        descripcion: "",
        precio: 0,
        moneda: "USD",
        duracionMin: 60,
        canal: "Meet",
        incluye: [],
        detalles: [],
        activo: true,
      });
      return;
    }
    let activo = true;
    api
      .servicioPorSlug(slug)
      .then((r) => {
        if (!activo) return;
        const s = r.servicio;
        setServicio(s);
        setForm({
          nombre: s.nombre,
          slug: s.slug,
          categoria: s.categoria,
          descripcion: s.descripcion,
          precio: s.precio,
          moneda: s.moneda,
          duracionMin: s.duracionMin,
          canal: s.canal,
          incluye: s.incluye,
          detalles: s.detalles,
          activo: s.activo,
        });
      })
      .catch(() => setError("No se pudo cargar el servicio."));
    return () => {
      activo = false;
    };
  }, [slug]);

  const set = <K extends keyof ServicioInput>(
    k: K,
    v: ServicioInput[K],
  ): void => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  const enviar = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form) return;
    setGuardando(true);
    setError(null);
    try {
      if (editando && servicio) {
        await api.actualizarServicio(servicio.id, form);
      } else {
        await api.crearServicio(form);
      }
      navigate("/admin/servicios");
    } catch {
      setError("No se pudo guardar el servicio. Revisa los campos.");
    } finally {
      setGuardando(false);
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
        to="/admin/servicios"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primario)] hover:underline"
      >
        <ArrowLeft className="size-4" />
        Volver a la lista
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {editando ? `Editar: ${servicio?.nombre}` : "Nuevo servicio"}
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
          <span>Categoría</span>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Categoría"
            value={form.categoria}
            onChange={(e) => set("categoria", e.target.value as ServicioInput["categoria"])}
          >
            <option value="auditoria">Auditoría</option>
            <option value="asesoria">Asesoría</option>
            <option value="aceleracion">Aceleración</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          <span>Precio por sesión (USD)</span>
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
          <span>Duración (min)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Duración"
            value={form.duracionMin ?? 60}
            onChange={(e) => set("duracionMin", Number(e.target.value))}
          />
        </label>
        <label className="block text-sm font-medium">
          <span>Canal de videollamada</span>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Canal"
            value={form.canal ?? "Meet"}
            onChange={(e) => set("canal", e.target.value as ServicioInput["canal"])}
          >
            <option value="Meet">Meet</option>
            <option value="Zoom">Zoom</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            aria-label="Activo"
            checked={form.activo ?? true}
            onChange={(e) => set("activo", e.target.checked)}
          />
          Publicado en la vitrina
        </label>

        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Descripción (texto descriptivo)</span>
          <EditorTexto
            html={form.descripcion}
            onChange={(html) => set("descripcion", html)}
            textoAcuerdo="Describe en detalle qué se hace en la sesión, para quién es y qué se entrega al cerrar."
          />
        </div>

        <label className="block text-sm font-medium sm:col-span-2">
          <span>Qué se trabaja (una por línea)</span>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={4}
            aria-label="Incluye"
            value={(form.incluye ?? []).join("\n")}
            onChange={(e) =>
              set("incluye", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))
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

        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/servicios")}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="accent" disabled={guardando}>
            <Save className="size-4" />
            {guardando ? "Guardando..." : "Guardar servicio"}
          </Button>
        </div>
      </form>
    </div>
  );
}
