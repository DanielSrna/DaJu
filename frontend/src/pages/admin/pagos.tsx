import { useEffect, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/cliente";
import type { PagoItem } from "@/lib/api/tipos";

/** Bandeja admin: verificar comprobantes de pago (confirmar o rechazar). */
export function AdminPagos() {
  const [pagos, setPagos] = useState<PagoItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});

  const cargar = (): void => {
    api
      .pagosPorVerificar()
      .then((r) => setPagos(r.pagos))
      .catch(() => setError("No pudimos cargar los pagos por verificar."));
  };

  useEffect(() => {
    cargar();
  }, []);

  const confirmar = async (pago: PagoItem): Promise<void> => {
    if (!window.confirm(`¿Confirmar el pago de ${pago.descripcion}?`)) return;
    setProcesando(pago.id);
    setError(null);
    try {
      await api.confirmarPago(pago.id);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcesando(null);
    }
  };

  const rechazar = async (pago: PagoItem): Promise<void> => {
    const motivo = motivos[pago.id]?.trim();
    if (!motivo) {
      setError("Escribe el motivo del rechazo para avisarle al cliente.");
      return;
    }
    setProcesando(pago.id);
    setError(null);
    try {
      await api.rechazarPago(pago.id, motivo);
      setMotivos((m) => ({ ...m, [pago.id]: "" }));
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => (window.location.href = "/cliente")}
      >
        <ArrowLeft className="size-4" /> Volver al portal
      </Button>
      <h1 className="mt-3 text-2xl font-bold">Verificar pagos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Revisa el nombre, el monto y el código en el mensaje de la transacción
        antes de confirmar.
      </p>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-col gap-4">
        {!pagos ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : pagos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay comprobantes pendientes. ¡Todo al día!
          </p>
        ) : (
          pagos.map((p) => (
            <article key={p.id} className="rounded-xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.descripcion}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.emailCliente} · ${p.monto} {p.moneda}
                    {p.montoCop
                      ? ` · $${p.montoCop.toLocaleString("es-CO")} COP`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Código: <strong>{p.codigo}</strong>
                    {p.metodoPago ? ` · Método: ${p.metodoPago}` : ""}
                    {p.referenciaCliente
                      ? ` · Ref. cliente: ${p.referenciaCliente}`
                      : ""}
                  </p>
                </div>
                {p.comprobante && (
                  <a
                    href={p.comprobante.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primario)] underline"
                  >
                    Ver comprobante <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="accent"
                  size="sm"
                  disabled={procesando === p.id}
                  onClick={() => void confirmar(p)}
                >
                  {procesando === p.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Check />
                  )}
                  Confirmar pago
                </Button>
                <Input
                  value={motivos[p.id] ?? ""}
                  onChange={(e) =>
                    setMotivos((m) => ({ ...m, [p.id]: e.target.value }))
                  }
                  placeholder="Motivo del rechazo"
                  aria-label={`Motivo del rechazo de ${p.descripcion}`}
                  className="sm:max-w-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  disabled={procesando === p.id}
                  onClick={() => void rechazar(p)}
                >
                  <X /> Rechazar
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminPagos;
