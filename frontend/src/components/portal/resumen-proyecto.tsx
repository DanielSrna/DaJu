import { useEffect, useState } from "react";
import {
  BarChart3,
  Download,
  FileCheck2,
  Gauge,
  Layers,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorInforme } from "@/components/portal/editor-informe";
import { api } from "@/lib/api/cliente";
import type { InformeResumen } from "@/lib/api/tipos";

interface Props {
  familia: "proyecto" | "espacio";
  id: string;
  esAdmin: boolean;
}

/**
 * Resumen del proyecto: composición, costos, impacto y resultados de las
 * pruebas. El cliente ve el detalle completo solo al descargar el PDF.
 */
export function ResumenProyecto({ familia, id, esAdmin }: Props) {
  const cliente =
    familia === "proyecto" ? api.informeProyecto : api.informeEspacio;
  const [informe, setInforme] = useState<InformeResumen | null>(null);

  const cargar = (): void => {
    cliente
      .obtener(id)
      .then((r) => setInforme(r.informe))
      .catch(() => setInforme(null));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!informe) return null;

  const fmt = (n: number): string => n.toLocaleString("es-CO");
  const pct = (p: number | null): string =>
    p == null ? "Pendiente" : `${p}%`;

  const tarjetas = [
    {
      icono: Layers,
      titulo: "Composición",
      valor: `${informe.vistas} vistas · ${informe.funciones} funciones`,
    },
    {
      icono: Wallet,
      titulo: "Costos",
      valor: `$${fmt(informe.costoTotal)} ${informe.entorno.moneda} · pagado $${fmt(
        informe.montoPagado,
      )}`,
    },
    {
      icono: Target,
      titulo: "Impacto calculado",
      valor: pct(informe.impacto.porcentaje),
      nota: informe.impacto.descripcion,
    },
    {
      icono: Gauge,
      titulo: "Pruebas de rendimiento",
      valor: `${informe.rendimiento.total} pruebas · ${pct(
        informe.rendimiento.promedio,
      )}`,
    },
    {
      icono: ShieldCheck,
      titulo: "Pruebas de seguridad",
      valor: `${informe.seguridad.total} pruebas · ${pct(
        informe.seguridad.promedio,
      )}`,
    },
    {
      icono: FileCheck2,
      titulo: "Tests ejecutados",
      valor: `${informe.tests.aprobados} aprobados de ${informe.tests.total}`,
    },
  ];

  return (
    <section className="mt-6 rounded-2xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <BarChart3 className="size-5 text-[var(--brand-acento)]" />
          Resumen del proyecto
        </h2>
        <Button asChild variant="outline" size="sm">
          <a href={cliente.urlPdf(id)} target="_blank" rel="noreferrer">
            <Download /> Descargar informe (PDF)
          </a>
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Lo que compone tu proyecto y las pruebas que le hicimos. El detalle
        completo de cada prueba va en el PDF.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tarjetas.map(({ icono: Icono, titulo, valor, nota }) => (
          <div key={titulo} className="rounded-xl border p-4">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icono className="size-3.5" /> {titulo}
            </dt>
            <dd className="mt-1 text-sm font-semibold">{valor}</dd>
            {nota && (
              <dd className="mt-1 text-xs text-muted-foreground">{nota}</dd>
            )}
          </div>
        ))}
      </dl>

      {esAdmin && (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--brand-primario)]">
            Editar informe técnico (admin)
          </summary>
          <EditorInforme
            familia={familia}
            id={id}
            pruebas={informe.pruebas ?? []}
            impacto={informe.impacto}
            onCambiar={cargar}
          />
        </details>
      )}
    </section>
  );
}
