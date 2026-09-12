import { useEffect, useState } from "react";
import { BadgePlus, Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/cliente";
import type {
  CategoriaFuncionalidad,
  FuncionalidadExtra,
  SolicitudFuncion,
} from "@/lib/api/tipos";

const CATEGORIA_LABEL: Record<CategoriaFuncionalidad, string> = {
  integraciones: "Integraciones",
  pagina: "Funcionalidades de página",
  usuarios: "Usuarios y cuentas",
  datos: "Automatización y datos",
};

const COMPLEJIDAD_LABEL: Record<FuncionalidadExtra["complejidad"], string> = {
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
};

interface CatalogoProps {
  familia: "proyecto" | "espacio";
  id: string;
  onSolicitada: () => void;
}

/**
 * Lista predefinida de funciones para sumar al proyecto.
 * En paquetes, cada función agrega su propia vista y abre la negociación;
 * en plantillas, abre la solicitud directa.
 */
export function CatalogoFunciones({
  familia,
  id,
  onSolicitada,
}: CatalogoProps) {
  const [catalogo, setCatalogo] = useState<FuncionalidadExtra[] | null>(null);
  const [solicitando, setSolicitando] = useState<string | null>(null);
  const [personal, setPersonal] = useState({ titulo: "", descripcion: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    api
      .funcionalidades()
      .then((r) => setCatalogo(r.funcionalidades))
      .catch(() => setCatalogo([]));
  }, []);

  const solicitar = async (f: FuncionalidadExtra): Promise<void> => {
    setSolicitando(f.id);
    setError(null);
    setAviso(null);
    try {
      if (familia === "espacio") {
        await api.crearSolicitud(id, {
          titulo: f.nombre,
          descripcion:
            f.descripcion || `Función del catálogo: ${f.nombre}`,
          costoSugerido: f.precio,
          origen: "catalogo",
          catalogoClave: f.id,
        });
      } else {
        await api.crearVistaBriefing(id, f.nombre, f.precio);
      }
      setAviso(`"${f.nombre}" quedó en tu lista para cotizar.`);
      onSolicitada();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSolicitando(null);
    }
  };

  const pedirPersonalizada = async (): Promise<void> => {
    if (
      personal.titulo.trim().length < 2 ||
      personal.descripcion.trim().length < 5
    ) {
      setError("Cuéntanos el nombre y qué necesitas (mínimo 5 caracteres).");
      return;
    }
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      if (familia === "espacio") {
        await api.crearSolicitud(id, {
          titulo: personal.titulo.trim(),
          descripcion: personal.descripcion.trim(),
        });
      } else {
        await api.crearVistaBriefing(id, personal.titulo.trim());
      }
      setPersonal({ titulo: "", descripcion: "" });
      setAviso("Tu función quedó en la lista; el equipo la cotiza pronto.");
      onSolicitada();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const porCategoria = (catalogo ?? []).reduce<
    Map<string, FuncionalidadExtra[]>
  >((grupos, f) => {
    const lista = grupos.get(f.categoria) ?? [];
    lista.push(f);
    grupos.set(f.categoria, lista);
    return grupos;
  }, new Map());

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Sparkles className="size-5 text-[var(--brand-acento)]" />
        Funciones predefinidas
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tócalas para sumarlas a tu proyecto. El equipo confirma el alcance y el
        costo antes de que pagues.
      </p>

      {!catalogo ? (
        <p className="mt-4 text-sm text-muted-foreground">Cargando catálogo…</p>
      ) : catalogo.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          El catálogo está vacío; pide tu función personalizada abajo.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {[...porCategoria.entries()].map(([categoria, items]) => (
            <div key={categoria}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORIA_LABEL[categoria as CategoriaFuncionalidad] ??
                  categoria}
              </h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {items.map((f) => (
                  <article
                    key={f.id}
                    className="flex items-start justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{f.nombre}</p>
                      {f.descripcion && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {f.descripcion}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {COMPLEJIDAD_LABEL[f.complejidad]} · $
                        {f.precio.toLocaleString("es-CO")} USD
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={solicitando === f.id}
                      onClick={() => void solicitar(f)}
                      aria-label={`Solicitar ${f.nombre}`}
                    >
                      {solicitando === f.id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <BadgePlus />
                      )}
                      Solicitar
                    </Button>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-dashed p-4">
        <h3 className="text-sm font-semibold">
          ¿No encuentras tu función? Cuéntanos
        </h3>
        <div className="mt-2 flex flex-col gap-2">
          <Input
            value={personal.titulo}
            onChange={(e) =>
              setPersonal({ ...personal, titulo: e.target.value })
            }
            placeholder="Nombre de la función (ej. Facturación electrónica)"
            aria-label="Nombre de la función personalizada"
          />
          <Textarea
            rows={2}
            value={personal.descripcion}
            onChange={(e) =>
              setPersonal({ ...personal, descripcion: e.target.value })
            }
            placeholder="¿Qué debe hacer? El equipo la cotiza sin costo."
            aria-label="Descripción de la función personalizada"
          />
          <Button
            variant="accent"
            size="sm"
            className="self-start"
            disabled={enviando}
            onClick={() => void pedirPersonalizada()}
          >
            {enviando ? <Loader2 className="animate-spin" /> : <Plus />}
            Pedir función personalizada
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {aviso && <p className="mt-3 text-xs text-green-700">{aviso}</p>}
    </section>
  );
}

const ETIQUETA_ESTADO: Record<
  SolicitudFuncion["estado"],
  { texto: string; clase: string }
> = {
  abierta: { texto: "Pendiente", clase: "bg-muted text-muted-foreground" },
  respondida: { texto: "Respondida", clase: "bg-amber-100 text-amber-700" },
  aceptada: { texto: "Aceptada · por pagar", clase: "bg-sky-100 text-sky-700" },
  pagada: { texto: "Pagada ✓", clase: "bg-green-100 text-green-700" },
};

/** Lista de solicitudes de función: cliente pide/paga; admin responde. */
export function ListaSolicitudes({
  solicitudes,
  esAdmin,
  onResponder,
  onPagar,
}: {
  solicitudes: SolicitudFuncion[] | null;
  esAdmin: boolean;
  onResponder: (
    s: SolicitudFuncion,
    costo: number,
    texto: string,
  ) => Promise<void>;
  onPagar: (s: SolicitudFuncion) => Promise<void>;
}) {
  if (!solicitudes) {
    return <p className="text-sm text-muted-foreground">Cargando solicitudes…</p>;
  }
  if (solicitudes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin solicitudes todavía. Pide una función de la lista de arriba.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {solicitudes.map((s) => (
        <SolicitudItem
          key={s.id}
          s={s}
          esAdmin={esAdmin}
          onResponder={onResponder}
          onPagar={onPagar}
        />
      ))}
    </div>
  );
}

function SolicitudItem({
  s,
  esAdmin,
  onResponder,
  onPagar,
}: {
  s: SolicitudFuncion;
  esAdmin: boolean;
  onResponder: (
    s: SolicitudFuncion,
    costo: number,
    texto: string,
  ) => Promise<void>;
  onPagar: (s: SolicitudFuncion) => Promise<void>;
}) {
  const [costo, setCosto] = useState(
    String(s.costo || s.costoSugerido || ""),
  );
  const [texto, setTexto] = useState("");

  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex flex-wrap items-center gap-2 font-semibold">
          {s.titulo}
          {s.origen === "catalogo" && (
            <span className="rounded-full bg-[var(--brand-acento)]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--brand-primario)]">
              Catálogo
            </span>
          )}
        </h3>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ETIQUETA_ESTADO[s.estado].clase}`}
        >
          {ETIQUETA_ESTADO[s.estado].texto}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{s.descripcion}</p>
      {s.costoSugerido > 0 && s.estado !== "pagada" && (
        <p className="mt-1 text-xs text-muted-foreground">
          Precio de catálogo sugerido: $
          {s.costoSugerido.toLocaleString("es-CO")} USD
        </p>
      )}

      {esAdmin && s.estado === "abierta" && (
        <div className="mt-3 rounded-lg bg-muted/60 p-3">
          <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
            <input
              aria-label="Costo"
              type="number"
              min={0}
              placeholder="Costo USD"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              aria-label="Respuesta"
              placeholder="Respuesta para el cliente…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <Button
            variant="accent"
            size="sm"
            className="mt-3"
            disabled={!texto.trim()}
            onClick={() =>
              void onResponder(s, Number(costo || 0), texto.trim())
            }
          >
            Responder con costo
          </Button>
        </div>
      )}

      {s.estado === "respondida" && (
        <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
          <p className="font-semibold">Respuesta del equipo: ${s.costo} USD</p>
          <p className="mt-1 text-muted-foreground">{s.respuestaAdmin}</p>
          {!esAdmin && (
            <Button
              variant="accent"
              size="sm"
              className="mt-3"
              onClick={() => void onPagar(s)}
            >
              Aceptar y pagar ${s.costo} USD
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
