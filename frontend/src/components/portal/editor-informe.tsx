import { useEffect, useState } from "react";
import { Check, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/cliente";
import type { PruebaInforme } from "@/lib/api/tipos";

interface Props {
  familia: "proyecto" | "espacio";
  id: string;
  pruebas: PruebaInforme[];
  impacto: { porcentaje: number | null; descripcion: string };
  onCambiar: () => void;
}

type TipoPrueba = PruebaInforme["tipo"];

const TIPO_LABEL: Record<TipoPrueba, string> = {
  rendimiento: "Rendimiento",
  seguridad: "Seguridad",
  test: "Test",
};

const VACIO = {
  tipo: "rendimiento" as TipoPrueba,
  titulo: "",
  descripcion: "",
  calificacion: "",
  exitoso: true,
};

/** Editor admin del informe: impacto, pruebas de rendimiento/seguridad y tests. */
export function EditorInforme({
  familia,
  id,
  pruebas,
  impacto,
  onCambiar,
}: Props) {
  const cliente =
    familia === "proyecto" ? api.informeProyecto : api.informeEspacio;
  const [impactoForm, setImpactoForm] = useState({
    porcentaje: impacto.porcentaje?.toString() ?? "",
    descripcion: impacto.descripcion,
  });
  const [nuevo, setNuevo] = useState(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState(VACIO);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    setImpactoForm({
      porcentaje: impacto.porcentaje?.toString() ?? "",
      descripcion: impacto.descripcion,
    });
  }, [impacto.porcentaje, impacto.descripcion]);

  const ejecutar = async (
    clave: string,
    accion: () => Promise<unknown>,
  ): Promise<void> => {
    setOcupado(clave);
    setError(null);
    setAviso(null);
    try {
      await accion();
      onCambiar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(null);
    }
  };

  const guardarImpacto = (): void => {
    void ejecutar("impacto", () =>
      cliente.actualizarImpacto(id, {
        porcentaje:
          impactoForm.porcentaje.trim() === ""
            ? null
            : Number(impactoForm.porcentaje),
        descripcion: impactoForm.descripcion,
      }),
    ).then(() => setAviso("Impacto guardado"));
  };

  const agregar = (): void => {
    if (nuevo.titulo.trim().length < 2) {
      setError("Escribe el título de la prueba.");
      return;
    }
    const datos = {
      tipo: nuevo.tipo,
      titulo: nuevo.titulo.trim(),
      descripcion: nuevo.descripcion.trim(),
      ...(nuevo.tipo === "test"
        ? { exitoso: nuevo.exitoso }
        : nuevo.calificacion.trim() !== ""
          ? { calificacion: Number(nuevo.calificacion) }
          : {}),
    };
    void ejecutar("nuevo", () => cliente.agregarPrueba(id, datos)).then(() =>
      setNuevo(VACIO),
    );
  };

  const guardarEdicion = (p: PruebaInforme): void => {
    void ejecutar(p.id, () =>
      cliente.actualizarPrueba(id, p.id, {
        titulo: edicion.titulo.trim(),
        descripcion: edicion.descripcion.trim(),
        ...(p.tipo === "test"
          ? { exitoso: edicion.exitoso }
          : edicion.calificacion.trim() !== ""
            ? { calificacion: Number(edicion.calificacion) }
            : { calificacion: null }),
      }),
    ).then(() => setEditandoId(null));
  };

  return (
    <div className="mt-4">
      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
      {aviso && <p className="mb-3 text-xs text-green-700">{aviso}</p>}

      {/* Impacto calculado por el equipo */}
      <div className="rounded-xl border bg-muted/30 p-3">
        <p className="text-sm font-semibold">Impacto calculado</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[110px_1fr_auto]">
          <Input
            type="number"
            min={0}
            max={100}
            value={impactoForm.porcentaje}
            onChange={(e) =>
              setImpactoForm({ ...impactoForm, porcentaje: e.target.value })
            }
            placeholder="% (0-100)"
            aria-label="Porcentaje de impacto"
          />
          <Input
            value={impactoForm.descripcion}
            onChange={(e) =>
              setImpactoForm({ ...impactoForm, descripcion: e.target.value })
            }
            placeholder="Nota del impacto (ej. menos tareas manuales)"
            aria-label="Descripción del impacto"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={ocupado === "impacto"}
            onClick={guardarImpacto}
          >
            {ocupado === "impacto" ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Agregar prueba o test */}
      <div className="mt-3 rounded-xl border border-dashed p-3">
        <p className="text-sm font-semibold">Agregar prueba o test</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <select
            value={nuevo.tipo}
            onChange={(e) =>
              setNuevo({ ...nuevo, tipo: e.target.value as TipoPrueba })
            }
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            aria-label="Tipo de prueba"
          >
            <option value="rendimiento">Prueba de rendimiento</option>
            <option value="seguridad">Prueba de seguridad</option>
            <option value="test">Test</option>
          </select>
          <Input
            value={nuevo.titulo}
            onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })}
            placeholder="Título"
            aria-label="Título de la nueva prueba"
          />
          <Textarea
            rows={2}
            value={nuevo.descripcion}
            onChange={(e) =>
              setNuevo({ ...nuevo, descripcion: e.target.value })
            }
            placeholder="Descripción"
            aria-label="Descripción de la nueva prueba"
            className="sm:col-span-2"
          />
          {nuevo.tipo === "test" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={nuevo.exitoso}
                onChange={(e) =>
                  setNuevo({ ...nuevo, exitoso: e.target.checked })
                }
              />
              Test exitoso
            </label>
          ) : (
            <Input
              type="number"
              min={0}
              max={100}
              value={nuevo.calificacion}
              onChange={(e) =>
                setNuevo({ ...nuevo, calificacion: e.target.value })
              }
              placeholder="Calificación (1-100)"
              aria-label="Calificación de la nueva prueba"
            />
          )}
        </div>
        <Button
          variant="accent"
          size="sm"
          className="mt-2"
          disabled={ocupado === "nuevo"}
          onClick={agregar}
        >
          {ocupado === "nuevo" ? <Loader2 className="animate-spin" /> : <Plus />}
          Agregar
        </Button>
      </div>

      {/* Lista editable */}
      <ol className="mt-3 space-y-2">
        {pruebas.map((p) => (
          <li key={p.id} className="rounded-xl border p-3">
            {editandoId === p.id ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={edicion.titulo}
                  onChange={(e) =>
                    setEdicion({ ...edicion, titulo: e.target.value })
                  }
                  aria-label="Título de la prueba"
                />
                {p.tipo === "test" ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={edicion.exitoso}
                      onChange={(e) =>
                        setEdicion({ ...edicion, exitoso: e.target.checked })
                      }
                    />
                    Test exitoso
                  </label>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={edicion.calificacion}
                    onChange={(e) =>
                      setEdicion({ ...edicion, calificacion: e.target.value })
                    }
                    placeholder="Calificación (1-100)"
                    aria-label="Calificación de la prueba"
                  />
                )}
                <Textarea
                  rows={2}
                  value={edicion.descripcion}
                  onChange={(e) =>
                    setEdicion({ ...edicion, descripcion: e.target.value })
                  }
                  aria-label="Descripción de la prueba"
                  className="sm:col-span-2"
                />
                <div className="flex gap-2 sm:col-span-2">
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={ocupado === p.id}
                    onClick={() => guardarEdicion(p)}
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
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {p.titulo}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                      {TIPO_LABEL[p.tipo]}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {p.tipo === "test"
                        ? p.exitoso
                          ? "Aprobado"
                          : "Fallido"
                        : p.calificacion != null
                          ? `${p.calificacion}/100`
                          : "Sin calificar"}
                    </span>
                  </p>
                  {p.descripcion && (
                    <p className="text-xs text-muted-foreground">
                      {p.descripcion}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditandoId(p.id);
                      setEdicion({
                        tipo: p.tipo,
                        titulo: p.titulo,
                        descripcion: p.descripcion,
                        calificacion: p.calificacion?.toString() ?? "",
                        exitoso: p.exitoso ?? true,
                      });
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar "${p.titulo}"?`)) {
                        void ejecutar(p.id, () =>
                          cliente.eliminarPrueba(id, p.id),
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
    </div>
  );
}
