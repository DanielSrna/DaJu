import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Copy,
  Landmark,
  Loader2,
  Smartphone,
  Upload,
  Wallet,
} from "lucide-react";
import { SiPaypal, SiTether, SiWise, SiZelle } from "react-icons/si";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import type { MetodoPago, PagoItem } from "@/lib/api/tipos";

const ESTADOS_ABIERTOS: PagoItem["estado"][] = [
  "pending",
  "en_revision",
  "rechazado",
];

function IconoMetodo({ metodo }: { metodo: MetodoPago }) {
  const clave = metodo.clave.toLowerCase();
  if (clave.includes("paypal")) return <SiPaypal className="size-6" />;
  if (clave.includes("wise")) return <SiWise className="size-6" />;
  if (clave.includes("zelle")) return <SiZelle className="size-6" />;
  if (clave.includes("usdt") || clave.includes("tether"))
    return <SiTether className="size-6" />;
  if (clave.includes("banco") || clave.includes("transferencia"))
    return <Landmark className="size-6" />;
  if (clave.includes("nequi") || clave.includes("davi"))
    return <Smartphone className="size-6" />;
  return <Wallet className="size-6" />;
}

/** Página de pago: elegir método, ver instrucciones y subir comprobante. */
export function Pagar() {
  const { pagoId } = useParams<{ pagoId: string }>();
  const [pago, setPago] = useState<PagoItem | null>(null);
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [metodoElegido, setMetodoElegido] = useState<MetodoPago | null>(null);
  const [montoCop, setMontoCop] = useState<number | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [referencia, setReferencia] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = (): void => {
    if (!pagoId) return;
    api
      .pagoPorId(pagoId)
      .then((r) => {
        setPago(r.pago);
        setMontoCop(r.pago.montoCop);
      })
      .catch(() => setError("No pudimos cargar este pago."));
    api
      .metodosPago()
      .then((r) => setMetodos(r.metodos))
      .catch(() => setMetodos([]));
  };

  useEffect(() => {
    cargar();
    // Al volver de PayPal, capturamos la orden automáticamente.
    const params = new URLSearchParams(window.location.search);
    if (pagoId && params.get("paypal") === "ok") {
      api
        .capturarPaypalPago(pagoId)
        .then((r) => setPago(r.pago))
        .catch((e) => setError((e as Error).message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagoId]);

  const copiar = async (texto: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setError("No pudimos copiar. Selecciona el texto manualmente.");
    }
  };

  const elegir = async (metodo: MetodoPago): Promise<void> => {
    if (!pagoId) return;
    setError(null);
    setEnviando(true);
    try {
      const r = await api.elegirMetodoPago(pagoId, metodo.clave);
      setPago(r.pago);
      setMetodoElegido(r.metodo);
      setMontoCop(r.montoCop);
      if (r.urlPago) window.location.href = r.urlPago;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const subir = async (): Promise<void> => {
    if (!pagoId || !archivo) return;
    setError(null);
    setEnviando(true);
    try {
      const r = await api.subirComprobantePago(
        pagoId,
        archivo,
        referencia.trim() || undefined,
      );
      setPago(r.pago);
      setArchivo(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  if (!pago) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-muted-foreground">{error ?? "Cargando pago…"}</p>
      </div>
    );
  }

  const abierto = ESTADOS_ABIERTOS.includes(pago.estado);
  const instrucciones = metodoElegido
    ? metodoElegido.instrucciones.replace("{codigo}", pago.codigo)
    : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => (window.location.href = "/cliente/pagos")}
      >
        <ArrowLeft className="size-4" /> Volver a pagos
      </Button>

      <h1 className="mt-3 text-2xl font-bold">Pagar {pago.descripcion}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ${pago.monto.toLocaleString("es-CO")} {pago.moneda}
        {montoCop ? ` · $${montoCop.toLocaleString("es-CO")} COP` : ""}
      </p>

      {pago.estado === "paid" ? (
        <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <BadgeCheck className="mx-auto size-10 text-green-700" />
          <p className="mt-3 font-semibold text-green-800">Pago confirmado</p>
          <p className="mt-1 text-sm text-green-700">
            Ya aplicamos tu pago. Revisa el progreso en tu portal.
          </p>
          <Button
            className="mt-4"
            onClick={() => (window.location.href = "/cliente")}
          >
            Ir a mi portal
          </Button>
        </div>
      ) : null}

      {pago.estado === "en_revision" && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            Comprobante en revisión
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Nuestro equipo lo verifica y te avisamos por correo. Si necesitas
            corregirlo, puedes subir uno nuevo.
          </p>
          {pago.comprobante && (
            <a
              href={pago.comprobante.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-amber-800 underline"
            >
              Ver comprobante subido
            </a>
          )}
        </div>
      )}

      {pago.estado === "rechazado" && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">
            Comprobante rechazado
          </p>
          <p className="mt-1 text-xs text-destructive">
            {pago.motivoRechazo || "No pudimos verificar el pago."} Sube uno
            nuevo o escríbenos por el chat de tu proyecto.
          </p>
        </div>
      )}

      {abierto && (
        <>
          {/* Código único */}
          <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border bg-muted/40 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Código para tu transacción
              </p>
              <p className="mt-1 text-lg font-bold tracking-wider">
                {pago.codigo}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Escríbelo en el mensaje o descripción del pago.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void copiar(pago.codigo)}
            >
              {copiado ? <Check /> : <Copy />}
              {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>

          {/* Selección de método */}
          <h2 className="mt-8 text-lg font-semibold">Elige cómo pagar</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {metodos.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={enviando}
                onClick={() => void elegir(m)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  metodoElegido?.id === m.id
                    ? "border-[var(--brand-acento)] bg-[var(--brand-acento)]/10"
                    : "hover:bg-muted"
                }`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <IconoMetodo metodo={m} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {m.nombre}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {m.tipo === "paypal"
                      ? "Pago en línea inmediato"
                      : m.moneda === "COP"
                        ? "Transferencia en pesos"
                        : "Transferencia en dólares"}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {metodos.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Aún no hay métodos disponibles. Escríbenos por el chat.
            </p>
          )}

          {/* Instrucciones del método manual */}
          {metodoElegido && metodoElegido.tipo === "manual" && (
            <div className="mt-6 rounded-xl border p-5">
              <h3 className="font-semibold">
                Datos para pagar con {metodoElegido.nombre}
              </h3>
              {montoCop ? (
                <p className="mt-2 text-2xl font-bold">
                  ${montoCop.toLocaleString("es-CO")}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    COP
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  El equipo confirmará el monto en pesos al revisar tu pago.
                </p>
              )}
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Titular</dt>
                  <dd className="text-right font-medium">
                    {metodoElegido.titular}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Datos</dt>
                  <dd className="text-right font-medium">
                    {metodoElegido.datos}
                  </dd>
                </div>
              </dl>
              {instrucciones && (
                <p className="mt-3 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                  {instrucciones}
                </p>
              )}
              {metodoElegido.qrUrl ? (
                <img
                  src={metodoElegido.qrUrl}
                  alt={`QR de ${metodoElegido.nombre}`}
                  className="mt-4 size-40 rounded-lg border object-contain"
                />
              ) : metodoElegido.datos ? (
                <QRCodeSVG
                  value={metodoElegido.datos}
                  size={160}
                  className="mt-4 rounded-lg border bg-white p-2"
                />
              ) : null}
            </div>
          )}

          {/* Comprobante */}
          <div className="mt-8 rounded-xl border p-5">
            <h3 className="font-semibold">Sube tu comprobante</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Imagen (JPG, PNG, WebP) o PDF. Debe verse el monto, la fecha y el
              código {pago.codigo}.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                aria-label="Comprobante"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
              />
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Número de transacción (opcional)"
                aria-label="Número de transacción"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <Button
                variant="accent"
                disabled={!archivo || enviando}
                onClick={() => void subir()}
              >
                {enviando ? <Loader2 className="animate-spin" /> : <Upload />}
                {enviando ? "Subiendo…" : "Enviar comprobante"}
              </Button>
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export default Pagar;
