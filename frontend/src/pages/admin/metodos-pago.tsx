import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/cliente";
import type { MetodoPago, MetodoPagoInput } from "@/lib/api/tipos";

const VACIO: MetodoPagoInput = {
  nombre: "",
  tipo: "manual",
  moneda: "COP",
  titular: "",
  datos: "",
  instrucciones: "",
  qrUrl: "",
  activo: true,
  orden: 0,
};

/** Admin: catálogo de métodos de pago + tasa USD→COP. */
export function AdminMetodosPago() {
  const [metodos, setMetodos] = useState<MetodoPago[] | null>(null);
  const [form, setForm] = useState<MetodoPagoInput>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tasa, setTasa] = useState<string>("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = (): void => {
    api
      .metodosPagoAdmin()
      .then((r) => setMetodos(r.metodos))
      .catch(() => setError("No pudimos cargar los métodos."));
    api
      .cms()
      .then((r) => setTasa(String(r.tasaCop ?? 0)))
      .catch(() => null);
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardarTasa = async (): Promise<void> => {
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const r = await api.actualizarTasaCop(Number(tasa));
      setTasa(String(r.tasaCop));
      setAviso("Tasa actualizada");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const guardarMetodo = async (): Promise<void> => {
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      if (editandoId) {
        await api.actualizarMetodoPago(editandoId, form);
      } else {
        await api.crearMetodoPago(form);
      }
      setForm(VACIO);
      setEditandoId(null);
      cargar();
      setAviso("Método guardado");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const editar = (m: MetodoPago): void => {
    setEditandoId(m.id);
    setForm({
      nombre: m.nombre,
      tipo: m.tipo,
      moneda: m.moneda,
      titular: m.titular,
      datos: m.datos,
      instrucciones: m.instrucciones,
      qrUrl: m.qrUrl,
      activo: m.activo,
      orden: m.orden,
    });
  };

  const eliminar = async (m: MetodoPago): Promise<void> => {
    if (!window.confirm(`¿Eliminar el método ${m.nombre}?`)) return;
    try {
      await api.eliminarMetodoPago(m.id);
      cargar();
    } catch (e) {
      setError((e as Error).message);
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
      <h1 className="mt-3 text-2xl font-bold">Métodos de pago</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Configura las cuentas, llaves e instrucciones que verán tus clientes.
      </p>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {aviso && <p className="mt-3 text-sm text-green-700">{aviso}</p>}

      <section className="mt-6 rounded-xl border p-5">
        <h2 className="font-semibold">Tasa USD → COP</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Se congela en cada pago para los métodos en pesos.
        </p>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="tasa-cop">Pesos por dólar</Label>
            <Input
              id="tasa-cop"
              type="number"
              min={0}
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
              className="max-w-40"
            />
          </div>
          <Button
            variant="outline"
            disabled={guardando}
            onClick={() => void guardarTasa()}
          >
            {guardando ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar tasa
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border p-5">
        <h2 className="font-semibold">
          {editandoId ? "Editar método" : "Nuevo método"}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="metodo-nombre">Nombre</Label>
            <Input
              id="metodo-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nequi"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="metodo-tipo">Tipo</Label>
            <select
              id="metodo-tipo"
              value={form.tipo}
              onChange={(e) =>
                setForm({
                  ...form,
                  tipo: e.target.value as MetodoPagoInput["tipo"],
                })
              }
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="manual">Manual (transferencia)</option>
              <option value="paypal">PayPal (en línea)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="metodo-moneda">Moneda</Label>
            <select
              id="metodo-moneda"
              value={form.moneda}
              onChange={(e) =>
                setForm({
                  ...form,
                  moneda: e.target.value as MetodoPagoInput["moneda"],
                })
              }
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="COP">COP (pesos)</option>
              <option value="USD">USD (dólares)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="metodo-titular">Titular</Label>
            <Input
              id="metodo-titular"
              value={form.titular}
              onChange={(e) => setForm({ ...form, titular: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor="metodo-datos">
              Datos (llave, celular o cuenta)
            </Label>
            <Input
              id="metodo-datos"
              value={form.datos}
              onChange={(e) => setForm({ ...form, datos: e.target.value })}
              placeholder="Llave Bre-B: 300 000 0000"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor="metodo-instrucciones">Instrucciones</Label>
            <Textarea
              id="metodo-instrucciones"
              rows={2}
              value={form.instrucciones}
              onChange={(e) =>
                setForm({ ...form, instrucciones: e.target.value })
              }
              placeholder="Escribe el código {codigo} en el mensaje y sube el comprobante."
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="metodo-qr">URL del QR (opcional)</Label>
            <Input
              id="metodo-qr"
              value={form.qrUrl}
              onChange={(e) => setForm({ ...form, qrUrl: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="metodo-orden">Orden</Label>
            <Input
              id="metodo-orden"
              type="number"
              min={0}
              value={form.orden ?? 0}
              onChange={(e) =>
                setForm({ ...form, orden: Number(e.target.value) })
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo ?? true}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activo (visible para clientes)
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            variant="accent"
            disabled={guardando || form.nombre.trim().length < 2}
            onClick={() => void guardarMetodo()}
          >
            {guardando ? <Loader2 className="animate-spin" /> : <Plus />}
            {editandoId ? "Guardar cambios" : "Crear método"}
          </Button>
          {editandoId && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditandoId(null);
                setForm(VACIO);
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-3">
        {!metodos ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : metodos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay métodos configurados.
          </p>
        ) : (
          metodos.map((m) => (
            <article
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div>
                <p className="font-semibold">
                  {m.nombre}
                  {!m.activo && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                      Inactivo
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.tipo === "paypal" ? "PayPal" : "Manual"} · {m.moneda}
                  {m.datos ? ` · ${m.datos}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editar(m)}
                >
                  <Pencil /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => void eliminar(m)}
                >
                  <Trash2 /> Eliminar
                </Button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

export default AdminMetodosPago;
