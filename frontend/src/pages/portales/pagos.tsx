import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCcw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";
import type { PagoItem } from "@/lib/api/tipos";

const ESTADO: Record<PagoItem["estado"], { texto: string; clase: string }> = {
  pending: { texto: "Pendiente", clase: "bg-amber-100 text-amber-700" },
  en_revision: { texto: "En revisión", clase: "bg-blue-100 text-blue-700" },
  paid: { texto: "Pagado", clase: "bg-green-100 text-green-700" },
  failed: { texto: "Fallido", clase: "bg-red-100 text-red-700" },
  rechazado: { texto: "Rechazado", clase: "bg-red-100 text-red-700" },
  refunded: { texto: "Reembolsado", clase: "bg-gray-200 text-gray-700" },
};

const PAGABLES: PagoItem["estado"][] = ["pending", "en_revision", "rechazado"];

/** Historial de pagos. Cliente ve los suyos; admin los de todos (con reembolso). */
export function Pagos() {
  const { usuario } = useModoEdicion();
  const esAdmin = usuario?.rol === "admin";
  const [pagos, setPagos] = useState<PagoItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reembolsando, setReembolsando] = useState<string | null>(null);

  const cargar = (): void => {
    const fn = esAdmin ? api.pagosAdmin() : api.misPagos();
    fn.then((r) => setPagos(r.pagos)).catch(() =>
      setError("No pudimos cargar tus pagos."),
    );
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAdmin]);

  const reembolsar = async (p: PagoItem): Promise<void> => {
    if (!window.confirm(`¿Reembolsar ${p.descripcion} ($${p.monto} USD)?`)) return;
    setReembolsando(p.id);
    try {
      await api.reembolsarPago(p.id);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReembolsando(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/cliente")}>
        <ArrowLeft className="size-4" /> Volver al portal
      </Button>
      <h1 className="mt-3 text-2xl font-bold">Pagos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {esAdmin
          ? "Todos los pagos de la plataforma (reembolsos desde aquí)."
          : "Tu historial de pagos y reembolsos."}
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-3">
        {!pagos ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : pagos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no tienes pagos. Los registros aparecen aquí al comprar.
          </p>
        ) : (
          pagos.map((p) => (
            <article key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primario)]/[0.08]">
                  <Layers className="size-5 text-[var(--brand-acento)]" />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {p.descripcion || p.productoSlug}
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      {p.tipoProducto}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("es-CO")} ·{" "}
                    {esAdmin && p.referencia ? `Ref: ${p.referencia.slice(0, 14)}… · ` : ""}
                    {esAdmin && p.codigo ? `Código: ${p.codigo} · ` : ""}
                    {p.cantidad > 1 ? `${p.cantidad} sesiones · ` : ""}
                    ${p.monto} {p.moneda}
                    {p.montoCop ? ` · $${p.montoCop.toLocaleString("es-CO")} COP` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO[p.estado].clase}`}>
                  {ESTADO[p.estado].texto}
                </span>
                {!esAdmin && PAGABLES.includes(p.estado) && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() =>
                      (window.location.href = `/cliente/pagar/${p.id}`)
                    }
                  >
                    {p.estado === "pending" ? "Pagar" : "Ver pago"}
                  </Button>
                )}
                {esAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (window.location.href = "/admin/pagos")}
                  >
                    Verificar
                  </Button>
                )}
                {esAdmin && p.estado === "paid" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    disabled={reembolsando === p.id}
                    onClick={() => void reembolsar(p)}
                    aria-label={`Reembolsar ${p.descripcion}`}
                  >
                    <RefreshCcw className="size-3.5" />
                    {reembolsando === p.id ? "…" : "Reembolsar"}
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
