import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { usePublicacionesSeccion } from "@/components/blog/use-publicaciones-seccion";

interface Pregunta {
  pregunta: string;
  respuesta: string;
  /** Slug del blog al que enlaza "Conoce más" (solo si está publicado). */
  concepto?: string;
}

const PREGUNTAS: Pregunta[] = [
  {
    pregunta: "¿Cuánto cuesta empezar?",
    respuesta:
      "La fase de planeación y diseño es completamente gratis: creas tu cuenta, conversamos tu idea, definimos alcance y vistas, y solo pagas cuando acordemos el desarrollo. El pago se hace por etapas, así que nunca desembolsas todo de golpe.",
  },
  {
    pregunta: "¿Qué garantías hay?",
    respuesta:
      "Todos los paquetes incluyen soporte técnico por un período definido (2, 6 o 12 meses según el paquete). Si algo no funciona como acordamos dentro de la garantía, lo corregimos sin costo.",
    concepto: "garantia-y-soporte-postventa",
  },
  {
    pregunta: "¿Qué servicios se ofrecen después de la compra?",
    respuesta:
      "Después de cotizar recibes: un briefing guiado para entregar el contenido, seguimiento de tu proyecto por etapas (planeación gratis, desarrollo por hitos y entrega) y soporte con garantía.",
    concepto: "garantia-y-soporte-postventa",
  },
  {
    pregunta: "¿Cuánto tarda un proyecto?",
    respuesta:
      "Cada paquete tiene un tiempo de entrega en días hábiles (por ejemplo, una landing puede estar lista en 10 días). La fecha se congela al momento de la compra y puedes seguirla en tu portal.",
  },
  {
    pregunta: "¿Cuánto cuesta mantener el proyecto después?",
    respuesta:
      "Durante la garantía el soporte está incluido. Pasada la garantía, puedes contratar soporte continuo o pedir cambios puntuales con costo cotizado según el alcance.",
  },
  {
    pregunta: "¿Necesito saber de tecnología para empezar?",
    respuesta:
      "No. Tú describes tu negocio en el briefing y nosotros nos encargamos de la parte técnica. Te acompañamos en todo el proceso.",
  },
  {
    pregunta: "¿Y si necesito algo que no está en los paquetes?",
    respuesta:
      "Puedes sumar funcionalidades adicionales con precio según su complejidad, o comprar el paquete base y negociar una funcionalidad especial con nosotros.",
  },
  {
    pregunta: "¿Por qué necesito una web si ya me va bien con Instagram?",
    respuesta:
      "Instagram te presta el canal: la web te da independencia. En la web controlas tu información, tu listado y tus ofertas sin depender de un algoritmo, y las personas investigan en Google antes de contactarte (8 de cada 10 lo hacen).",
  },
  {
    pregunta: "¿Cómo sé que el proyecto va a funcionar?",
    respuesta:
      "Trabajamos con estándares de calidad de producto (ISO/IEC 25000) y procesos alineados a ISO 9001. Además, cada proyecto pasa por pruebas antes de publicarse y lo ajustamos dentro de la garantía.",
  },
  {
    pregunta: "¿Puedo pagar en cuotas o con otro método?",
    respuesta:
      "Sí. Pagas por etapas (nunca todo de golpe) y eliges el medio que te sirva: Bre-B, Nequi, DaviPlata, Nu, transferencia a cuenta de ahorros o PayPal. En tu entorno ves las instrucciones y confirmamos cada pago contigo.",
  },
  {
    pregunta: "¿Qué pasa si quiero cambiar el diseño después de la entrega?",
    respuesta:
      "Durante la garantía lo ajustamos sin costo. Pasada la garantía, los cambios se cotizan según el alcance: siempre sabrás cuánto cuesta antes de aprobarlo.",
  },
  {
    pregunta: "¿Ofrecen plantillas listas para usar?",
    respuesta:
      "Sí: tenemos plantillas de reservas, inventario y cotizadores listas para desplegar en días. Tú asumes el costo de la nube y nosotros lo dejamos funcionando. También puedes sumar funciones extra.",
    concepto: "funcionalidades-extra-para-tu-web",
  },
  {
    pregunta: "¿Hacen acompañamiento cuando estoy arrancando?",
    respuesta:
      "Sí, y es lo que más disfrutamos. Tu proyecto arranca con un briefing guiado y lo llevamos de la mano: defines tu negocio, nosotros hacemos el resto.",
    concepto: "proceso-de-un-proyecto-web",
  },
];

export function FAQ() {
  const publicaciones = usePublicacionesSeccion("faq");

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold">Preguntas frecuentes</h1>
      <p className="mt-2 text-muted-foreground">
        Las dudas más comunes antes de empezar un proyecto.
      </p>

      <Accordion type="single" collapsible className="mt-8">
        {PREGUNTAS.map((item, i) => {
          const enlazar = item.concepto && publicaciones.has(item.concepto);
          return (
            <AccordionItem key={item.pregunta} value={`item-${i}`}>
              <AccordionTrigger>{item.pregunta}</AccordionTrigger>
              <AccordionContent>
                <p>{item.respuesta}</p>
                {enlazar && (
                  <p className="mt-3">
                    <Link
                      to={`/blog/${item.concepto}`}
                      className="font-semibold text-[var(--brand-primario)] underline underline-offset-4 hover:text-[var(--brand-acento)]"
                    >
                      Conoce más acerca de esto →
                    </Link>
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="mt-10 rounded-xl bg-muted p-6 text-center">
        <p className="font-medium">¿Tienes otra pregunta?</p>
        <Button asChild variant="accent" className="mt-3">
          <Link to="/contacto">Escríbenos</Link>
        </Button>
      </div>
    </div>
  );
}
