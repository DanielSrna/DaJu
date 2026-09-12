import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  Layers,
  MessageSquare,
  PlusCircle,
  ShieldQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";
import type { ResumenPortal } from "@/lib/api/tipos";

function Bloqueada({ etiqueta, familia }: { etiqueta: string; familia: string }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-dashed">
      <div
        className="pointer-events-none select-none p-6 opacity-30"
        aria-hidden="true"
      >
        <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
          <Layers className="size-5" />
        </div>
        <h2 className="mt-4 text-xl font-bold">{etiqueta}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Estado del proyecto, fechas, briefing y garantía en un solo lugar.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>· Seguimiento por etapas</li>
          <li>· Chat directo con el equipo</li>
          <li>· Soporte con garantía</li>
        </ul>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 py-8 backdrop-blur-[2px]">
        <ShieldQuestion className="size-10 text-[var(--brand-primario)]/50" />
        <p className="max-w-[240px] text-center text-sm font-semibold text-[var(--brand-primario)]/80">
          Este entorno es específico a {familia}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-1">
          <Link to="/productos">
            Ir a productos
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </article>
  );
}

/** Enlace de un entorno como administrador: todos los clientes, todos los espacios. */
function EnlaceAdmin({
  a,
  titulo,
  detalle,
}: {
  a: { pathname: string; search?: string };
  titulo: string;
  detalle: string;
}) {
  return (
    <Link
      to={a}
      className="group flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-[var(--brand-acento)]/60 hover:bg-[var(--brand-acento)]/5"
    >
      <span>
        <span className="block font-medium">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{detalle}</span>
      </span>
      <ArrowRight className="size-4 text-[var(--brand-acento)] opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

/** Portal: cliente ve lo suyo con blur en lo ajeno; admin ve TODOS los entornos. */
export function Portal() {
  const { usuario } = useModoEdicion();
  const esAdmin = usuario?.rol === "admin";
  const [resumen, setResumen] = useState<ResumenPortal | null>(null);
  const [metricas, setMetricas] = useState<Awaited<ReturnType<typeof api.metricasAdmin>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .resumenPortal()
      .then(setResumen)
      .catch(() => setError("No pudimos cargar tu portal. Recarga la página."));
    if (usuario?.rol === "admin") {
      api.metricasAdmin().then(setMetricas).catch(() => null);
    }
  }, [usuario?.rol]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">{error}</p>
      </div>
    );
  }
  if (!resumen) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-muted-foreground">Cargando tu portal…</p>
      </div>
    );
  }

  const tienePaquetes = resumen.proyectos.length > 0;
  const tienePlantillas = resumen.espacios.some((e) => e.tipoProducto === "plantilla");
  const tieneServicios = resumen.espacios.some((e) => e.tipoProducto === "servicio");
  const plantillas = resumen.espacios.filter((e) => e.tipoProducto === "plantilla");
  const servicios = resumen.espacios.filter((e) => e.tipoProducto === "servicio");

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="text-3xl font-bold">
        {esAdmin ? "Portal de administrador" : "Tu portal"}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {esAdmin
          ? "Todos los entornos de tus clientes: entra a cada uno para responder, subir obra gris o confirmar citas."
          : "Cada familia que compras abre su propio espacio de trabajo. Las zonas bloqueadas también son tuyas cuando compras esa familia."}
      </p>

      {!esAdmin && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild variant="accent" size="lg">
            <Link to="/productos">
              <PlusCircle className="size-4" />
              Adquirir un nuevo producto
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            Ya tienes sesión: no vuelves a registrarte.
          </span>
        </div>
      )}

      {esAdmin && metricas && (
        <section aria-label="Métricas de la plataforma" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Ingresos del mes", `$${metricas.ingresosMes.toLocaleString("es-CO")}`],
            ["Pagos este mes", String(metricas.pagosMes)],
            ["Paquetes activos", String(metricas.proyectosActivos)],
            ["Entornos plantilla", String(metricas.entornosPlantillas)],
            ["Entornos consultoría", String(metricas.entornosServicios)],
            ["Sesiones sin usar", String(metricas.sesionesPendientes)],
            ["Citas por confirmar", String(metricas.citasPorConfirmar)],
            ["Funciones por cotizar", String(metricas.solicitudesAbiertas)],
          ].map(([t, v]) => (
            <div key={t} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{t}</p>
              <p className="mt-1 text-2xl font-bold text-[var(--brand-primario)]">{v}</p>
            </div>
          ))}
        </section>
      )}
      {esAdmin && (
        <nav aria-label="Herramientas de administración" className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/proyectos">Centro de proyectos</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/cliente/pagos">Pagos y reembolsos</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/pagos">Verificar pagos</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/metodos-pago">Métodos de pago</Link>
          </Button>
        </nav>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {/* Paquetes */}
        {tienePaquetes ? (
          <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
              <Layers className="size-5" />
            </div>
            <h2 className="mt-4 text-xl font-bold">Paquetes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {resumen.proyectos.length}{" "}
              {resumen.proyectos.length === 1 ? "proyecto" : "proyectos"}
            </p>
            <div className="mt-3 space-y-2">
              {resumen.proyectos.map((p) => (
                esAdmin ? (
                  <EnlaceAdmin
                    key={p.id}
                    a={{ pathname: `/cliente/paquetes/${p.id}` }}
                    titulo={p.nombre}
                    detalle={`${p.clienteNombre ?? ""} · ${p.estado}`}
                  />
                ) : (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{p.nombre}</span>
                    <span className="text-xs text-muted-foreground">{p.estado}</span>
                  </div>
                )
              ))}
            </div>
            {!esAdmin && (
              <Button asChild className="mt-auto pt-3 w-full" variant="accent">
                <Link to={`/cliente/paquetes/${resumen.proyectos[0]!.id}`}>
                  Ir al proyecto
                  <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <Bloqueada etiqueta="Paquetes" familia="los paquetes" />
        )}

        {/* Plantillas */}
        {tienePlantillas ? (
          <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
              <Blocks className="size-5" />
            </div>
            <h2 className="mt-4 text-xl font-bold">Plantillas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {plantillas.length} espacio(s)
            </p>
            <div className="mt-3 space-y-2">
              {plantillas.map((e) => (
                esAdmin ? (
                  <EnlaceAdmin
                    key={e.id}
                    a={{ pathname: `/cliente/plantillas/${e.id}` }}
                    titulo={e.productoSlug || "Plantilla"}
                    detalle={`${e.clienteNombre ?? ""} · ${e.sesiones.usadas}/${e.sesiones.total} sesiones`}
                  />
                ) : null
              ))}
            </div>
            {!esAdmin && (
              <Button asChild className="mt-auto pt-3 w-full" variant="accent">
                <Link to={`/cliente/plantillas/${plantillas[0]!.id}`}>
                  Ir al espacio
                  <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <Bloqueada etiqueta="Plantillas" familia="las plantillas" />
        )}

        {/* Servicios */}
        {tieneServicios ? (
          <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
              <CheckCircle2 className="size-5" />
            </div>
            <h2 className="mt-4 text-xl font-bold">Consultoría</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Citas y sesiones de tu compra.
            </p>
            <div className="mt-3 space-y-2">
              {servicios.map((e) => (
                esAdmin ? (
                  <EnlaceAdmin
                    key={e.id}
                    a={{ pathname: `/cliente/servicios/${e.id}` }}
                    titulo={e.productoSlug || "Consultoría"}
                    detalle={`${e.clienteNombre ?? ""} · ${e.sesiones.usadas}/${e.sesiones.total} sesiones`}
                  />
                ) : null
              ))}
            </div>
            {!esAdmin && (
              <Button asChild className="mt-auto pt-3 w-full" variant="accent">
                <Link to={`/cliente/servicios/${servicios[0]!.id}`}>
                  Ir al espacio
                  <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <Bloqueada etiqueta="Consultoría" familia="la consultoría" />
        )}
      </div>

      <div className="mt-10 rounded-2xl border bg-muted/50 p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <MessageSquare className="size-4 text-[var(--brand-acento)]" />
          {esAdmin ? "Gestión de entornos" : "Tu compra en un solo lugar"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {esAdmin
            ? "Desde cada entorno puedes: confirmar citas (servicios), subir obra gris y aprobar vistas (plantillas), responder solicitudes de funciones y chatear con el cliente."
            : "Pagos, sesiones y entornos: lo que compres aparecerá aquí y en el correo de confirmación."}
        </p>
      </div>
    </div>
  );
}
