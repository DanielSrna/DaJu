import { useEffect, useState } from "react";
import { Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { textoCms } from "@/lib/cms";

interface EditableTextoProps {
  /** Solo con modo admin se muestra el lapicito. */
  modoEdicion: boolean;
  clave: string;
  /** Valor "en vivo" (con borrador aplicado). */
  valor: string;
  /** Textos publicados (para el fallback por clave). */
  textos: Record<string, string>;
  onGuardar: (clave: string, valor: string) => Promise<void>;
}

/**
 * Texto editable inline: con modo admin, al pasar el mouse aparece un lapicito;
 * al hacer clic se abre un campo con Guardar/Cancelar. Sin admin, es solo un
 * <span> con el texto (el fallback viene de textoCms).
 * Mantiene estado interno para que el guardado se refleje al instante, incluso
 * si el padre (CMS en la nube) aún no terminó de actualizar sus props.
 */
export function EditableTexto({
  modoEdicion,
  clave,
  valor,
  textos,
  onGuardar,
}: EditableTextoProps) {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);
  const [vivo, setVivo] = useState<string | null>(null);

  // Sincroniza el valor interno cuando cambia el prop (o al montar).
  useEffect(() => {
    setVivo(textoCms(textos, clave, valor));
  }, [clave, textos, valor]);

  const mostrar = vivo ?? textoCms(textos, clave, valor);

  const abrir = (): void => {
    setBorrador(mostrar);
    setAbierto(true);
  };

  const guardar = async (): Promise<void> => {
    setGuardando(true);
    setError(false);
    try {
      await onGuardar(clave, borrador);
      setVivo(borrador);
      setAbierto(false);
    } catch {
      setError(true);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <span className="relative inline">
      <span className="group inline-block">
        <span className={abierto ? "invisible" : "inline"}>{mostrar}</span>
        {modoEdicion && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Editar ${clave}`}
            title="Editar"
            onClick={abrir}
            className={`ml-1 inline-flex size-5 rounded align-middle text-[var(--brand-primario)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 ${abierto ? "opacity-0" : ""}`}
          >
            <Pencil className="size-3" />
          </Button>
        )}
      </span>

      {abierto && (
        <span className="absolute inset-x-0 top-full z-20 mt-1 block max-w-md rounded-lg border bg-background p-2 shadow-lg ring-1 ring-black/5">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              aria-label="Texto"
              className="flex-1 rounded border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void guardar();
                if (e.key === "Escape") setAbierto(false);
              }}
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Guardar"
              title="Guardar"
              onClick={() => void guardar()}
              disabled={guardando}
            >
              <Check className="size-4 text-[var(--brand-primario)]" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cancelar"
              title="Cancelar"
              onClick={() => setAbierto(false)}
            >
              <X className="size-4 text-muted-foreground" />
            </Button>
          </div>
          {error && (
            <p className="mt-1 text-xs text-red-600">No se pudo guardar. Intenta de nuevo.</p>
          )}
        </span>
      )}
    </span>
  );
}
