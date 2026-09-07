export type SemaforoEstado = "pendiente" | "negociacion" | "cotizacion" | "aprobada";

const OPCIONES: Record<SemaforoEstado, { texto: string; clase: string }> = {
  pendiente: { texto: "Pendiente", clase: "bg-red-100 text-red-700" },
  negociacion: { texto: "En negociación", clase: "bg-amber-100 text-amber-700" },
  cotizacion: { texto: "En cotización", clase: "bg-gray-200 text-gray-700" },
  aprobada: { texto: "Aprobada", clase: "bg-green-100 text-green-700" },
};

export function Semaforo({ estado }: { estado: SemaforoEstado }) {
  const o = OPCIONES[estado] ?? OPCIONES.pendiente;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${o.clase}`}
    >
      <span className="size-2 rounded-full bg-current" />
      {o.texto}
    </span>
  );
}
