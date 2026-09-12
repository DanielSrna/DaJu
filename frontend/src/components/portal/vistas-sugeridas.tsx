import { useState } from "react";
import { Check, Loader2, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/cliente";

/** Vistas típicas que el cliente puede sumar con confirmación. */
const VISTAS_SUGERIDAS = [
  "Inicio",
  "Servicios",
  "Productos / catálogo",
  "Detalle de producto",
  "Nosotros",
  "Contacto",
  "Blog",
  "Preguntas frecuentes",
  "Reservas / agenda",
  "Panel de administración",
  "Iniciar sesión / registro",
  "Carrito y pagos",
];

interface Props {
  familia: "proyecto" | "espacio";
  id: string;
  /** Nombres de vistas ya existentes (para no repetir). */
  existentes: string[];
  onCreada: () => void;
}

/**
 * Lista predefinida de vistas: cada una pide confirmación antes de agregarse
 * (así un clic accidental no crea nada). Incluye la vista personalizada.
 */
export function VistasSugeridas({ familia, id, existentes, onCreada }: Props) {
  const [creando, setCreando] = useState<string | null>(null);
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null);
  const [personal, setPersonal] = useState({ nombre: "", descripcion: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const yaExiste = (nombre: string): boolean =>
    existentes.some((v) => v.toLowerCase() === nombre.toLowerCase());

  const crear = async (
    nombre: string,
    descripcion?: string,
  ): Promise<void> => {
    if (!nombre.trim() || yaExiste(nombre)) return;
    setCreando(nombre);
    setError(null);
    setAviso(null);
    try {
      if (familia === "espacio") {
        await api.crearVista(id, nombre.trim(), undefined, descripcion);
      } else {
        await api.crearVistaBriefing(id, nombre.trim(), undefined, descripcion);
      }
      setPorConfirmar(null);
      setPersonal({ nombre: "", descripcion: "" });
      setAviso(`"${nombre.trim()}" quedó en tu lista para cotizar.`);
      onCreada();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreando(null);
    }
  };

  const pedirPersonalizada = async (): Promise<void> => {
    if (personal.nombre.trim().length < 2) {
      setError("Escribe el nombre de la vista.");
      return;
    }
    setEnviando(true);
    await crear(personal.nombre, personal.descripcion);
    setEnviando(false);
  };

  return (
    <section className="mt-6 rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Sparkles className="size-5 text-[var(--brand-acento)]" />
        Vistas sugeridas
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Elige una y confirma para agregarla; cada vista abre su negociación de
        alcance y costo.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {VISTAS_SUGERIDAS.map((v) => {
          const existe = yaExiste(v);
          return (
            <button
              key={v}
              type="button"
              disabled={existe || creando === v}
              onClick={() => setPorConfirmar(v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                existe
                  ? "cursor-default border-green-200 bg-green-50 text-green-700"
                  : "hover:border-[var(--brand-acento)] hover:bg-[var(--brand-acento)]/10"
              }`}
            >
              {creando === v ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              {v}
              {existe ? " ✓" : ""}
            </button>
          );
        })}
      </div>

      {/* Confirmación: un clic no crea nada por accidente */}
      {porConfirmar && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--brand-acento)]/60 bg-[var(--brand-acento)]/10 p-4">
          <p className="text-sm">
            ¿Seguro que quieres agregar la vista{" "}
            <strong>“{porConfirmar}”</strong>? Se abrirá su negociación de
            alcance y costo.
          </p>
          <div className="flex gap-2">
            <Button
              variant="accent"
              size="sm"
              disabled={creando === porConfirmar}
              onClick={() => void crear(porConfirmar)}
            >
              {creando === porConfirmar ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check />
              )}
              Sí, agregar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={creando === porConfirmar}
              onClick={() => setPorConfirmar(null)}
            >
              <X /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Vista personalizada */}
      <div className="mt-5 rounded-xl border border-dashed p-4">
        <h3 className="text-sm font-semibold">
          ¿No encuentras tu vista? Cuéntanos
        </h3>
        <div className="mt-2 flex flex-col gap-2">
          <Input
            value={personal.nombre}
            onChange={(e) =>
              setPersonal({ ...personal, nombre: e.target.value })
            }
            placeholder="Nombre de la vista (ej. Mapa de sedes)"
            aria-label="Nombre de la vista personalizada"
          />
          <Textarea
            rows={2}
            value={personal.descripcion}
            onChange={(e) =>
              setPersonal({ ...personal, descripcion: e.target.value })
            }
            placeholder="¿Qué debe mostrar o hacer? El equipo la cotiza sin costo."
            aria-label="Descripción de la vista personalizada"
          />
          <Button
            variant="accent"
            size="sm"
            className="self-start"
            disabled={enviando}
            onClick={() => void pedirPersonalizada()}
          >
            {enviando ? <Loader2 className="animate-spin" /> : <Plus />}
            Pedir vista personalizada
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {aviso && <p className="mt-3 text-xs text-green-700">{aviso}</p>}
    </section>
  );
}
