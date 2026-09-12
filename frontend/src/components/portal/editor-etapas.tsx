import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  LockOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, EtapaInput } from "@/lib/api/cliente";
import type { EtapaPortal } from "@/lib/api/tipos";

interface Props {
  familia: "proyecto" | "espacio";
  id: string;
  etapas: EtapaPortal[];
  /** Precio de catálogo del producto elegido (referencia para dividir etapas). */
  precioBase?: number;
  moneda?: string;
  onCambiar: () => void;
}

const VACIO: EtapaInput = {
  nombre: "",
  descripcion: "",
  monto: 0,
  requierePago: true,
};

/** Editor admin del plan de etapas (barra de progreso personalizable). */
export function EditorEtapas({
  familia,
  id,
  etapas,
  precioBase = 0,
  moneda = "USD",
  onCambiar,
}: Props) {
  const cliente = familia === "proyecto" ? api.etapasProyecto : api.etapasEspacio;
  const [nuevo, setNuevo] = useState<EtapaInput>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<EtapaInput>(VACIO);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = async (
    clave: string,
    accion: () => Promise<unknown>,
  ): Promise<void> => {
    setOcupado(clave);
    setError(null);
    try {
      await accion();
      onCambiar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(null);
    }
  };

  const agregar = (): void => {
    if (nuevo.nombre && nuevo.nombre.trim().length >= 2) {
      void ejecutar("nuevo", () =>
        cliente.agregar(id, nuevo),
      ).then(() => setNuevo(VACIO));
    }
  };

  const sumaEtapas = etapas.reduce(
    (total, e) => total + (e.requierePago ? e.monto : 0),
    0,
  );
  const diferencia = precioBase - sumaEtapas;

  /** La primera etapa sin cobro es la fase de planeación: no se mueve ni se borra. */
  const esPlaneacion = (e: EtapaPortal): boolean =>
    !e.requierePago && e.orden === 1;

  const mover = (indice: number, direccion: -1 | 1): void => {
    const orden = etapas.map((e) => String(e._id));
    const destino = indice + direccion;
    if (destino < 0 || destino >= orden.length) return;
    [orden[indice], orden[destino]] = [orden[destino], orden[indice]];
    void ejecutar("orden", () => cliente.reordenar(id, orden));
  };

  return (
    <div className="mt-4">
      {/* Referencia de precio para repartir las etapas sin pasarse ni cobrar de menos */}
      <div className="mb-3 grid gap-2 rounded-xl border bg-muted/40 p-3 text-xs sm:grid-cols-3">
        <p>
          <span className="block text-muted-foreground">
            Precio del producto elegido
          </span>
          <strong className="text-sm">
            ${precioBase.toLocaleString("es-CO")} {moneda}
          </strong>
        </p>
        <p>
          <span className="block text-muted-foreground">
            Suma de etapas con cobro
          </span>
          <strong className="text-sm">
            ${sumaEtapas.toLocaleString("es-CO")} {moneda}
          </strong>
        </p>
        <p>
          <span className="block text-muted-foreground">Diferencia</span>
          <strong
            className={`text-sm ${
              diferencia === 0
                ? "text-green-700"
                : diferencia > 0
                  ? "text-amber-700"
                  : "text-destructive"
            }`}
          >
            {diferencia < 0 ? "-" : ""}$
            {Math.abs(diferencia).toLocaleString("es-CO")} {moneda}
            {diferencia > 0
              ? " (por asignar)"
              : diferencia < 0
                ? " (excedido)"
                : " (cuadra)"}
          </strong>
        </p>
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      <ol className="space-y-2">
        {etapas.map((e, i) => (
          <li key={e._id} className="rounded-xl border p-3">
            {editandoId === e._id ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={edicion.nombre ?? ""}
                  onChange={(ev) =>
                    setEdicion({ ...edicion, nombre: ev.target.value })
                  }
                  aria-label="Nombre de la etapa"
                />
                <Input
                  type="number"
                  min={0}
                  value={edicion.monto ?? 0}
                  disabled={esPlaneacion(e)}
                  onChange={(ev) =>
                    setEdicion({ ...edicion, monto: Number(ev.target.value) })
                  }
                  aria-label="Monto de la etapa"
                />
                <Input
                  value={edicion.descripcion ?? ""}
                  onChange={(ev) =>
                    setEdicion({ ...edicion, descripcion: ev.target.value })
                  }
                  aria-label="Descripción de la etapa"
                  className="sm:col-span-2"
                />
                <div className="flex gap-2 sm:col-span-2">
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={ocupado === e._id}
                    onClick={() =>
                      void ejecutar(e._id, () =>
                        cliente.actualizar(id, String(e._id), edicion),
                      ).then(() => setEditandoId(null))
                    }
                  >
                    <Check /> Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditandoId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {e.nombre}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {e.requierePago ? `$${e.monto}` : "gratis"} ·{" "}
                      {e.pagoEstado} · {e.estado}
                    </span>
                  </p>
                  {e.descripcion && (
                    <p className="text-xs text-muted-foreground">
                      {e.descripcion}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Subir ${e.nombre}`}
                    disabled={i === 0 || esPlaneacion(e)}
                    onClick={() => mover(i, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Bajar ${e.nombre}`}
                    disabled={i === etapas.length - 1}
                    onClick={() => mover(i, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditandoId(String(e._id));
                      setEdicion({
                        nombre: e.nombre,
                        descripcion: e.descripcion,
                        monto: e.monto,
                        requierePago: e.requierePago,
                      });
                    }}
                  >
                    <Pencil /> Editar
                  </Button>
                  {e.estado !== "completada" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ocupado === e._id}
                      onClick={() =>
                        void ejecutar(e._id, () =>
                          cliente.cambiarEstado(id, String(e._id), "completada"),
                        )
                      }
                    >
                      <Check /> Completar
                    </Button>
                  )}
                  {e.estado === "bloqueada" && e.requierePago && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ocupado === e._id}
                      onClick={() =>
                        void ejecutar(e._id, () =>
                          cliente.cambiarEstado(id, String(e._id), "en_curso"),
                        )
                      }
                      title="Desbloquear sin pago (queda en bitácora)"
                    >
                      <LockOpen /> Desbloquear
                    </Button>
                  )}
                  {e.requierePago &&
                    e.pagoEstado !== "pagado" &&
                    e.pagoEstado !== "solicitado" && (
                      <Button
                        variant="accent"
                        size="sm"
                        disabled={ocupado === e._id}
                        onClick={() =>
                          void ejecutar(e._id, () =>
                            cliente.solicitarPago(id, String(e._id)),
                          )
                        }
                      >
                        Solicitar pago
                      </Button>
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={e.pagoEstado === "pagado" || esPlaneacion(e)}
                    title={
                      esPlaneacion(e)
                        ? "La etapa de planeación y diseño no se elimina"
                        : undefined
                    }
                    onClick={() => {
                      if (window.confirm(`¿Eliminar la etapa ${e.nombre}?`)) {
                        void ejecutar(e._id, () =>
                          cliente.eliminar(id, String(e._id)),
                        );
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-xl border border-dashed p-3">
        <p className="text-sm font-semibold">Agregar etapa</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Input
            value={nuevo.nombre ?? ""}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            placeholder="Nombre (ej. Inicio de desarrollo)"
            aria-label="Nombre de la nueva etapa"
          />
          <Input
            type="number"
            min={0}
            value={nuevo.monto ?? 0}
            onChange={(e) =>
              setNuevo({ ...nuevo, monto: Number(e.target.value) })
            }
            placeholder="Monto (0 = gratis)"
            aria-label="Monto de la nueva etapa"
          />
          <Input
            value={nuevo.descripcion ?? ""}
            onChange={(e) =>
              setNuevo({ ...nuevo, descripcion: e.target.value })
            }
            placeholder="Descripción (opcional)"
            aria-label="Descripción de la nueva etapa"
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={nuevo.requierePago ?? true}
              onChange={(e) =>
                setNuevo({ ...nuevo, requierePago: e.target.checked })
              }
            />
            Requiere pago para desbloquear
          </label>
          <Button
            size="sm"
            variant="accent"
            disabled={ocupado === "nuevo" || !nuevo.nombre}
            onClick={agregar}
          >
            <Plus /> Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}
