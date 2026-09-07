import { useRef, useState } from "react";
import { FileText, ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ArchivoPortada {
  url: string;
  publicId: string;
  nombre: string;
  mimeType: string;
  tamañoBytes?: number;
}

interface Props {
  archivos: ArchivoPortada[];
  onSubir: (archivo: File) => Promise<void>;
  onEliminar: (publicId: string) => Promise<void>;
  etiqueta?: string;
}

/** Lista de archivos de una vista: subir (imagen/PDF) y eliminar. */
export function ArchivosVista({ archivos, onSubir, onEliminar, etiqueta = "Archivos" }: Props) {
  const input = useRef<HTMLInputElement | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subir = async (file: File): Promise<void> => {
    setSubiendo(true);
    setError(null);
    try {
      await onSubir(file);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{etiqueta}</p>
        <Button
          variant="outline"
          size="sm"
          disabled={subiendo}
          onClick={() => input.current?.click()}
          aria-label={`Subir archivo a ${etiqueta}`}
        >
          {subiendo ? <Upload className="size-4 animate-pulse" /> : <Upload className="size-4" />}
          Subir
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void subir(f);
          }}
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {archivos.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Sin archivos todavía. Sube referencias, PDFs o capturas.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {archivos.map((a) => (
            <li
              key={a.publicId}
              className="flex items-center gap-3 rounded-lg border p-2.5"
            >
              {a.mimeType?.startsWith("image/") ? (
                <img
                  src={a.url}
                  alt={a.nombre}
                  className="size-12 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted">
                  <FileText className="size-5 text-muted-foreground" />
                </span>
              )}
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                title={a.nombre}
              >
                {a.nombre}
              </a>
              <button
                type="button"
                aria-label={`Eliminar ${a.nombre}`}
                onClick={() => void onEliminar(a.publicId)}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Marco de imagen de una vista: placeholder + imagen + botón de subida. */
export function MarcoImagen({
  titulo,
  imagen,
  onSubir,
  subirLabel,
  autorizado = true,
}: {
  titulo: string;
  imagen: { url: string; publicId: string } | null;
  onSubir: (archivo: File) => Promise<void>;
  subirLabel: string;
  autorizado?: boolean;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subir = async (file: File): Promise<void> => {
    setSubiendo(true);
    setError(null);
    try {
      await onSubir(file);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <figure className="rounded-xl border bg-muted/30 p-3">
      <figcaption className="flex items-center justify-between gap-2 text-sm font-semibold">
        {titulo}
        {autorizado && (
          <Button
            variant="outline"
            size="sm"
            disabled={subiendo}
            onClick={() => input.current?.click()}
            aria-label={subirLabel}
          >
            <ImagePlus className="size-4" />
            {subiendo ? "Subiendo…" : "Cambiar"}
          </Button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void subir(f);
          }}
        />
      </figcaption>
      {imagen ? (
        <img
          src={imagen.url}
          alt={titulo}
          className="mt-2 max-h-64 w-full rounded-lg border bg-background object-contain"
        />
      ) : (
        <div className="mt-2 flex h-40 w-full items-center justify-center rounded-lg border-2 border-dashed text-xs text-muted-foreground">
          Aún no hay imagen
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </figure>
  );
}
