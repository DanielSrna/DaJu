import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Layers, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { NavEntorno } from "@/components/portal/nav-entorno";
import { BarraEtapas } from "@/components/portal/barra-etapas";
import { EditorEtapas } from "@/components/portal/editor-etapas";
import { ResumenProyecto } from "@/components/portal/resumen-proyecto";
import { Semaforo } from "@/components/portal/semaforo";
import { ArchivosVista } from "@/components/portal/archivos-vista";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";
import { FileDown, Pencil } from "lucide-react";
import type {
  BriefingV2,
  BriefingV2Contenido,
} from "@/lib/api/tipos";

const ETIQUETA_ESTADO: Record<string, string> = {
  recibido: "Recibido",
  diseno: "Diseño",
  desarrollo: "Desarrollo",
  entregado: "Entregado",
};

/** Resumen del entorno de paquete: progreso + briefing + acceso a cada vista. */
export function EntornoPaquete() {
  const { id } = useParams<{ id: string }>();
  const [proyecto, setProyecto] = useState<Awaited<ReturnType<typeof api.proyectoPorId>>["proyecto"] | null>(null);
  const [briefing, setBriefing] = useState<BriefingV2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [garantia, setGarantia] = useState<{ activa: boolean; fechaExpiracion: string; diasRestantes: number; soporteMeses: number } | null>(null);
  const [bitacora, setBitacora] = useState<Array<{ id: string; tipo: string; mensaje: string; usuarioNombre: string; createdAt: string }> | null>(null);
  const { usuario } = useModoEdicion();
  const esAdmin = usuario?.rol === "admin";
  const [editandoBriefing, setEditandoBriefing] = useState(!esAdmin);

  const cargar = (): void => {
    if (!id) return;
    api.proyectoPorId(id).then((r) => setProyecto(r.proyecto)).catch(() => setError("No pudimos cargar el proyecto."));
    api.briefingV2(id).then((r) => setBriefing(r.briefing)).catch(() => null);
    api.garantiaProyecto(id).then((r) => setGarantia(r.garantia)).catch(() => null);
    api.bitacoraProyecto(id).then((r) => setBitacora(r.entradas)).catch(() => null);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error && !proyecto) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">{error}</p>
      </div>
    );
  }
  if (!proyecto) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-muted-foreground">Cargando tu proyecto…</p>
      </div>
    );
  }

  const contenido = briefing?.contenido ?? {};

  const setContenido = (nc: BriefingV2Contenido): void => {
    setBriefing((b) => (b ? { ...b, contenido: nc } : b));
  };

  const guardar = async (): Promise<void> => {
    if (!id) return;
    setGuardando(true);
    setGuardado(false);
    try {
      await api.guardarBriefingV2(id, contenido);
      setGuardado(true);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/cliente")}>
        <ArrowLeft className="size-4" /> Volver al portal
      </Button>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Layers className="size-6 text-[var(--brand-acento)]" />
            {proyecto.paquete.nombre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cliente: {proyecto.cliente.nombre} · Estado:{" "}
            {ETIQUETA_ESTADO[proyecto.estado] ?? proyecto.estado}
          </p>
        </div>
        <p className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm">
          <CalendarClock className="size-4 text-[var(--brand-acento)]" />
          Entrega:{" "}
          {proyecto.fechaEntrega
            ? new Date(proyecto.fechaEntrega).toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Por definir"}
        </p>
      </div>

      <NavEntorno familia="paquete" id={id!} activo="resumen" />

      {/* Barra de etapas (plan personalizable) */}
      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Progreso por etapas
        </h2>
        <div className="mt-3">
          <BarraEtapas
            etapas={proyecto.etapas}
            montoPagado={proyecto.montoPagado}
            montoTotal={proyecto.montoTotal}
            moneda={proyecto.moneda}
            onPagar={(pagoId) =>
              (window.location.href = `/cliente/pagar/${pagoId}`)
            }
          />
        </div>
        {esAdmin && id && (
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--brand-primario)]">
              Editar etapas y pagos (admin)
            </summary>
            <EditorEtapas
              familia="proyecto"
              id={id}
              etapas={proyecto.etapas}
              precioBase={proyecto.precioBase}
              moneda={proyecto.moneda}
              onCambiar={cargar}
            />
          </details>
        )}
      </section>

      {/* Resumen del proyecto: composición, costos, impacto y pruebas */}
      {id && (
        <ResumenProyecto familia="proyecto" id={id} esAdmin={esAdmin} />
      )}

      {/* Garantía de soporte */}
      {garantia && (
        <section className="mt-6 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold">Garantía de soporte</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                garantia.activa ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
              }`}
            >
              {garantia.activa ? "Activa" : "Expirada"}
            </span>
            <p className="text-sm text-muted-foreground">
              {garantia.soporteMeses} meses de soporte · vence el{" "}
              <strong>
                {new Date(garantia.fechaExpiracion).toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </strong>{" "}
              {garantia.activa && `· ${garantia.diasRestantes} días restantes`}
            </p>
          </div>
        </section>
      )}

      {/* Bitácora de actividad */}
      {bitacora && bitacora.length > 0 && (
        <section className="mt-6 rounded-2xl border bg-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <History className="size-4 text-[var(--brand-acento)]" /> Bitácora
          </h2>
          <ul className="mt-3 space-y-2">
            {bitacora.slice(0, 10).map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{b.mensaje}</span>
                <span className="shrink-0 text-xs text-muted-foreground/70">
                  {b.usuarioNombre ? `${b.usuarioNombre} · ` : ""}
                  {new Date(b.createdAt).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Resumen del briefing (saludo + flujo) */}
      <section className="mt-6 rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Briefing</h2>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/v1/proyectos/${id}/briefing/exportar`}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <FileDown className="size-3.5" /> Exportar informe (.txt)
            </a>
            {esAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditandoBriefing((v) => !v)}
              >
                <Pencil className="size-3.5" />
                {editandoBriefing ? "Ver informe" : "Editar briefing"}
              </Button>
            )}
            {editandoBriefing && (
              <Button variant="accent" size="sm" onClick={() => void guardar()} disabled={guardando}>
                {guardando ? "Guardando…" : <Save className="size-4" />}
                {guardando ? "" : "Guardar"}
              </Button>
            )}
          </div>
        </div>
        {guardado && <p className="mt-2 text-xs text-green-700">Guardado ✓</p>}

        {editandoBriefing ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">
            <span>¿De qué va tu negocio? (1-2 frases)</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              aria-label="De qué va tu negocio"
              value={contenido.resumen?.descripcionNegocio ?? ""}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  resumen: { ...contenido.resumen, descripcionNegocio: e.target.value },
                })
              }
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            <span>Objetivos que persigues con la web</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              aria-label="Objetivos"
              value={contenido.resumen?.objetivos ?? ""}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  resumen: { ...contenido.resumen, objetivos: e.target.value },
                })
              }
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            <span>¿Cómo lo resuelven hoy? (proceso actual)</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              aria-label="Proceso actual"
              value={contenido.resumen?.problemaActual ?? ""}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  resumen: { ...contenido.resumen, problemaActual: e.target.value },
                })
              }
            />
          </label>
          <label className="block text-sm font-medium">
            <span>Nombre de tu proyecto</span>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              aria-label="Nombre del proyecto"
              value={contenido.resumen?.nombreProyecto ?? ""}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  resumen: { ...contenido.resumen, nombreProyecto: e.target.value },
                })
              }
            />
          </label>
          <label className="block text-sm font-medium">
            <span>Plazo deseado</span>
            <div className="mt-1 flex gap-2">
              <input
                list="plazos"
                className="w-full rounded-md border px-3 py-2 text-sm"
                aria-label="Plazo deseado"
                placeholder="Lo antes posible / este mes…"
                value={contenido.resumen?.plazoDeseado ?? ""}
                onChange={(e) =>
                  setContenido({
                    ...contenido,
                    resumen: { ...contenido.resumen, plazoDeseado: e.target.value },
                  })
                }
              />
              <datalist id="plazos">
                <option value="Lo antes posible" />
                <option value="Este mes" />
                <option value="En 2 meses" />
                <option value="Sin prisa" />
              </datalist>
            </div>
          </label>
          <label className="block text-sm font-medium">
            <span>¿Tienes logo/identidad ya?</span>
            <select
              aria-label="Identidad actual"
              value={contenido.resumen?.identidadActual ?? ""}
              onChange={(e) =>
                setContenido({ ...contenido, resumen: { ...contenido.resumen, identidadActual: e.target.value } })
              }
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Elegir…</option>
              <option value="tengo">Sí, ya tengo logo y colores</option>
              <option value="construyo">No, la construimos juntos</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            <span>Idioma de la web</span>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              aria-label="Idioma"
              value={contenido.resumen?.idioma ?? "Español"}
              onChange={(e) =>
                setContenido({ ...contenido, resumen: { ...contenido.resumen, idioma: e.target.value } })
              }
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            <span>¿Qué DEBERÍA quedar fuera? (lo que NO quieres)</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              aria-label="No incluir"
              value={contenido.resumen?.noIncluir ?? ""}
              onChange={(e) =>
                setContenido({ ...contenido, resumen: { ...contenido.resumen, noIncluir: e.target.value } })
              }
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            <span>Referencias (links de ejemplo que te gusten)</span>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              aria-label="Referencias"
              placeholder="https://… (una por línea o separadas por coma)"
              value={contenido.resumen?.referenciasLinks ?? ""}
              onChange={(e) =>
                setContenido({ ...contenido, resumen: { ...contenido.resumen, referenciasLinks: e.target.value } })
              }
            />
          </label>
          <label className="block text-sm font-medium">
            <span>¿Cuántos usuarios tendrá?</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              aria-label="Cantidad de usuarios"
              value={contenido.resumen?.usuarios?.cantidad ?? 0}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  resumen: {
                    ...contenido.resumen,
                    usuarios: { ...contenido.resumen?.usuarios, cantidad: Number(e.target.value) },
                  },
                })
              }
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            <span>Flujo principal (qué pasa primero, luego…)</span>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              aria-label="Flujo principal"
              value={contenido.resumen?.flujoPrincipal ?? ""}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  resumen: { ...contenido.resumen, flujoPrincipal: e.target.value },
                })
              }
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            <span>Tipos de usuarios y permisos (uno por línea)</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              aria-label="Tipos y permisos"
              value={(contenido.resumen?.usuarios?.permisos ?? []).join("\n")}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  resumen: {
                    ...contenido.resumen,
                    usuarios: {
                      ...contenido.resumen?.usuarios,
                      permisos: e.target.value.split("\n").filter(Boolean),
                    },
                  },
                })
              }
            />
          </label>
        </div>
        ) : (
          <ReporteBriefing contenido={contenido} />
        )}
      </section>

      {/* Vistas: tarjetas que llevan a su página */}
      <section className="mt-6">
        <h2 className="text-lg font-bold">
          Vistas ({contenido.vistas?.length ?? 0})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada vista tiene su propia página: requisitos, obra gris, archivos y chat.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(contenido.vistas ?? []).map((v, i) => (
            <Link
              key={v.id}
              to={`/cliente/paquetes/${id}/vistas/${v.id}`}
              className="group rounded-xl border p-4 transition-colors hover:border-[var(--brand-acento)]/60 hover:bg-[var(--brand-acento)]/5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">
                  {i + 1}. {v.nombre}
                </h3>
                <Semaforo estado={v.semaforo} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {v.requisitos || "Sin requisitos todavía…"}
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--brand-primario)] opacity-0 transition-opacity group-hover:opacity-100">
                Ir a la vista →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Archivos generales del proyecto (imágenes y PDFs) */}
      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-bold">Archivos del proyecto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Logos, referencias o documentos que quieras compartir con el equipo.
        </p>
        <div className="mt-3">
          <ArchivosVista
            archivos={(briefing?.archivos ?? []).map((a) => ({
              url: a.url,
              publicId: a.publicId,
              nombre: a.nombre,
              mimeType: a.mimeType,
              tamañoBytes: a.tamañoBytes,
            }))}
            etiqueta="Archivos compartidos"
            onSubir={async (f) => {
              if (!id) return;
              await api.subirArchivoBriefing(id, f);
              cargar();
            }}
            onEliminar={async (publicId) => {
              if (!id) return;
              await api.eliminarArchivoBriefing(id, publicId);
              cargar();
            }}
          />
        </div>
      </section>
    </div>
  );
}

/** Informe de solo lectura (admin por defecto). */
function ReporteBriefing({ contenido }: { contenido: BriefingV2Contenido }) {
  const r = contenido.resumen ?? {};
  const fila = (etiqueta: string, valor?: unknown) =>
    valor ? (
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
        <dd className="mt-0.5 text-sm">{String(valor)}</dd>
      </div>
    ) : null;
  const ident = contenido.identidad ?? {};
  return (
    <dl className="mt-4 grid gap-4 rounded-xl bg-muted/40 p-5 sm:grid-cols-2">
      {fila("Proyecto", r.nombreProyecto)}
      {fila("Negocio", r.descripcionNegocio)}
      {fila("Objetivos", r.objetivos)}
      {fila("Cómo lo resuelven hoy", r.problemaActual)}
      {fila("Flujo principal", r.flujoPrincipal)}
      {fila("Ejemplo de flujo", r.ejemploFlujo)}
      {fila("Plazo deseado", r.plazoDeseado)}
      {fila("No incluir", r.noIncluir)}
      {fila("Referencias", r.referenciasLinks)}
      {fila("Idioma", r.idioma)}
      {fila("Identidad actual", (r.identidadActual ?? "") === "tengo" ? "Sí, ya tiene logo y colores" : (r.identidadActual ?? "") === "construyo" ? "No, se construye junto" : "")}
      {fila("Usuarios", r.usuarios ? `${r.usuarios.cantidad ?? 0} · ${(r.usuarios.tipos ?? []).join(", ")}` : "")}
      {fila("Permisos", r.usuarios?.permisos?.length ? (r.usuarios.permisos ?? []).join(", ") : "")}
      {fila("Identidad: fuentes", `${ident.fuentes?.tipo ?? ""}${ident.fuentes?.valor ? ` — ${ident.fuentes.valor}` : ""}`)}
      {fila("Identidad: colores", `${ident.colores?.tipo ?? ""}${ident.colores?.valor ? ` — ${ident.colores.valor}` : ""}`)}
      {fila("Identidad: vibra", `${ident.vibra?.tipo ?? ""}${ident.vibra?.valor ? ` — ${ident.vibra.valor}` : ""}`)}
    </dl>
  );
}
