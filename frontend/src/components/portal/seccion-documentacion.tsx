import { useEffect, useState } from "react";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/cliente";
import type { DocumentoEntorno } from "@/lib/api/tipos";

interface Props {
  familia: "proyecto" | "espacio";
  id: string;
  esAdmin: boolean;
}

/** Documentación del entorno: manuales PDF que sube el admin. */
export function SeccionDocumentacion({ familia, id, esAdmin }: Props) {
  const cliente =
    familia === "proyecto" ? api.documentosProyecto : api.documentosEspacio;
  const [documentos, setDocumentos] = useState<DocumentoEntorno[] | null>(null);
  const [form, setForm] = useState({ titulo: "", descripcion: "" });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = (): void => {
    cliente
      .listar(id)
      .then((r) => setDocumentos(r.documentos))
      .catch(() => setDocumentos([]));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const subir = async (): Promise<void> => {
    if (!archivo || form.titulo.trim().length < 2) {
      setError("Escribe un título y adjunta el PDF del manual.");
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      await cliente.subir(id, {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        archivo,
      });
      setForm({ titulo: "", descripcion: "" });
      setArchivo(null);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async (d: DocumentoEntorno): Promise<void> => {
    if (!window.confirm(`¿Eliminar el manual "${d.titulo}"?`)) return;
    try {
      await cliente.eliminar(id, d.id);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border bg-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <FileText className="size-5 text-[var(--brand-acento)]" />
        Documentación
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Manuales de uso del proyecto para consultar y descargar.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {!documentos ? (
          <p className="text-sm text-muted-foreground">Cargando manuales…</p>
        ) : documentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay manuales disponibles.
          </p>
        ) : (
          documentos.map((d) => (
            <article
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{d.titulo}</p>
                {d.descripcion && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {d.descripcion}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  PDF · {Math.max(1, Math.round(d.archivo.tamañoBytes / 1024))} KB
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={d.archivo.url}
                    target="_blank"
                    rel="noreferrer"
                    download={d.archivo.nombre}
                  >
                    <Download /> Descargar
                  </a>
                </Button>
                {esAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void eliminar(d)}
                    aria-label={`Eliminar ${d.titulo}`}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {esAdmin && (
        <div className="mt-4 rounded-xl border border-dashed p-4">
          <p className="text-sm font-semibold">Subir manual (admin)</p>
          <div className="mt-2 flex flex-col gap-2">
            <Input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Título (ej. Manual del administrador)"
              aria-label="Título del manual"
            />
            <Textarea
              rows={2}
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
              placeholder="Descripción breve"
              aria-label="Descripción del manual"
            />
            <input
              type="file"
              accept="application/pdf"
              aria-label="Archivo PDF del manual"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <Button
              variant="accent"
              size="sm"
              className="self-start"
              disabled={subiendo}
              onClick={() => void subir()}
            >
              {subiendo ? <Loader2 className="animate-spin" /> : <Upload />}
              Subir manual
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </section>
  );
}
