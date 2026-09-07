import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import type { MensajeChat } from "@/lib/api/tipos";

const POLLING_MS = 5000;

interface Props {
  contexto: "proyecto" | "espacio" | "vista";
  contextoId: string;
  alto?: string;
}

/** Chat reutilizable del portal: polling cada 5 s + envío. */
export function PanelChat({ contexto, contextoId, alto = "h-64" }: Props) {
  const [mensajes, setMensajes] = useState<MensajeChat[] | null>(null);
  const [cuerpo, setCuerpo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement | null>(null);

  const cargar = (): void => {
    api
      .mensajesChat(contexto, contextoId)
      .then((r) => setMensajes(r.mensajes))
      .catch(() => {
        if (!mensajes) setMensajes([]);
      });
  };

  useEffect(() => {
    setMensajes(null);
    cargar();
    const id = setInterval(cargar, POLLING_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexto, contextoId]);

  useEffect(() => {
    const el = caja.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes?.length]);

  const enviar = async (): Promise<void> => {
    const texto = cuerpo.trim();
    if (!texto) return;
    setEnviando(true);
    setError(null);
    try {
      await api.enviarMensaje({ contexto, contextoId, cuerpo: texto });
      setCuerpo("");
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="rounded-xl border">
      <div
        ref={caja}
        aria-label="Mensajes del chat"
        className={`${alto} space-y-2.5 overflow-y-auto p-4`}
      >
        {!mensajes ? (
          <p className="text-sm text-muted-foreground">Cargando conversación…</p>
        ) : mensajes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin mensajes todavía. Deja el primer requisito o pregunta.
          </p>
        ) : (
          mensajes.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.autorTipo === "cliente"
                  ? "ml-auto bg-[var(--brand-primario)] text-white"
                  : "bg-muted"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
                {m.autorTipo === "cliente" ? "Tú / cliente" : "Equipo DaJu"} ·{" "}
                {new Date(m.createdAt).toLocaleDateString("es-CO")}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap">{m.cuerpo}</p>
              {m.archivos.map((a) => (
                <img
                  key={a.publicId}
                  src={a.url}
                  alt={a.nombre}
                  className="mt-2 max-h-52 rounded-lg object-contain"
                />
              ))}
            </div>
          ))
        )}
      </div>
      {error && <p className="px-4 pb-1 text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 border-t p-3">
        <input
          aria-label="Escribe un mensaje"
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void enviar()}
          placeholder="Escribe un mensaje…"
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          variant="accent"
          size="sm"
          disabled={enviando || !cuerpo.trim()}
          onClick={() => void enviar()}
          aria-label="Enviar mensaje"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
