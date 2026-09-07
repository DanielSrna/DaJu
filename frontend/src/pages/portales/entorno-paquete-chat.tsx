import { useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavEntorno } from "@/components/portal/nav-entorno";
import { PanelChat } from "@/components/portal/panel-chat";

/** Chat del proyecto (página dedicada). */
export function EntornoPaqueteChat() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button variant="ghost" size="sm" onClick={() => (window.location.href = `/cliente/paquetes/${id}`)}>
        <ArrowLeft className="size-4" /> Volver al resumen
      </Button>
      <h1 className="mt-3 text-2xl font-bold">Chat del proyecto</h1>
      <NavEntorno familia="paquete" id={id ?? ""} activo="chat" />
      <p className="mt-3 text-sm text-muted-foreground">
        Preguntas generales, avances o lo que no quepa en una vista.
      </p>
      <div className="mt-4">
        <PanelChat contexto="proyecto" contextoId={id ?? ""} alto="h-80" />
      </div>
    </div>
  );
}
