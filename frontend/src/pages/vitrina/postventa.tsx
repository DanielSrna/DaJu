import { Link } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  LifeBuoy,
  MonitorCheck,
  MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicacionesSeccion } from "@/components/blog/use-publicaciones-seccion";
import { useModoEdicion } from "@/lib/modo-edicion";
import { EditableTexto } from "@/components/editor/editable-texto";
import { api } from "@/lib/api/cliente";
import { useTema } from "@/lib/tema";

const PASOS = [
  {
    icono: ClipboardList,
    titulo: "Briefing guiado",
    clave: "postventa.paso1",
    texto:
      "Después de comprar te guiamos para entregar el contenido de tu proyecto: textos, logos y requerimientos, todo en un solo lugar.",
  },
  {
    icono: MonitorCheck,
    titulo: "Seguimiento por etapas",
    clave: "postventa.paso2",
    texto:
      "Tu proyecto pasa por recibido, diseño, desarrollo y entrega. Ves el avance y la fecha estimada en tu portal en todo momento.",
  },
  {
    icono: FileText,
    titulo: "Fecha de entrega congelada",
    clave: "postventa.paso3",
    texto:
      "La fecha se fija el día de tu compra (días hábiles según el paquete), así sabes exactamente cuándo estará listo.",
  },
  {
    icono: LifeBuoy,
    titulo: "Garantía de soporte",
    clave: "postventa.paso4",
    texto:
      "Al entregar tu proyecto inicia la garantía: 2, 6 o 12 meses de soporte técnico según el paquete que elegiste.",
    concepto: "garantia-y-soporte-postventa",
  },
  {
    icono: MessagesSquare,
    titulo: "Asesoría post-venta",
    clave: "postventa.paso5",
    texto:
      "Sesiones de acompañamiento para clientes que ya tienen su proyecto en marcha y quieren seguir creciendo.",
  },
];

export function Postventa() {
  const publicaciones = usePublicacionesSeccion("postventa");
  const { modoEdicion } = useModoEdicion();
  const { cms } = useTema();
  const textos = cms.textos;

  const guardarTexto = async (clave: string, valor: string): Promise<void> => {
    await api.patchEditor({ textos: { [clave]: valor } });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="text-3xl font-bold">
        <EditableTexto
          modoEdicion={modoEdicion}
          clave="postventa.titulo"
          valor="Servicios post-venta"
          textos={textos}
          onGuardar={guardarTexto}
        />
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        <EditableTexto
          modoEdicion={modoEdicion}
          clave="postventa.subtitulo"
          valor="Comprar con DaJu no termina en la entrega: te acompañamos para que tu proyecto funcione y crezca."
          textos={textos}
          onGuardar={guardarTexto}
        />
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {PASOS.map(({ icono: Icono, titulo, clave, texto, concepto }) => {
          const enlazar = concepto && publicaciones.has(concepto);
          return (
            <article key={titulo} className="flex gap-4 rounded-xl border p-6">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
                <Icono className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">
                  <EditableTexto
                    modoEdicion={modoEdicion}
                    clave={`${clave}.titulo`}
                    valor={titulo}
                    textos={textos}
                    onGuardar={guardarTexto}
                  />
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <EditableTexto
                    modoEdicion={modoEdicion}
                    clave={`${clave}.texto`}
                    valor={texto}
                    textos={textos}
                    onGuardar={guardarTexto}
                  />
                </p>
                {enlazar && (
                  <Link
                    to={`/blog/${concepto}`}
                    className="mt-2 inline-block text-sm font-semibold text-[var(--brand-primario)] underline underline-offset-4 hover:text-[var(--brand-acento)]"
                  >
                    Conoce más acerca de esto →
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-12 rounded-2xl bg-[var(--brand-primario)] p-8 text-center text-white">
        <h2 className="text-2xl font-bold">
          <EditableTexto
            modoEdicion={modoEdicion}
            clave="postventa.cta.titulo"
            valor="¿Dudas sobre tu proyecto?"
            textos={textos}
            onGuardar={guardarTexto}
          />
        </h2>
        <p className="mt-2 text-white/70">
          <EditableTexto
            modoEdicion={modoEdicion}
            clave="postventa.cta.texto"
            valor="Escríbenos y te contamos cómo funciona el acompañamiento."
            textos={textos}
            onGuardar={guardarTexto}
          />
        </p>
        <Button asChild variant="accent" size="lg" className="mt-5">
          <Link to="/contacto">Contáctanos</Link>
        </Button>
      </div>
    </div>
  );
}
