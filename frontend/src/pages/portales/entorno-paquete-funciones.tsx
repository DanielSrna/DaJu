import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavEntorno } from "@/components/portal/nav-entorno";
import {
  CatalogoFunciones,
  ListaSolicitudes,
} from "@/components/portal/catalogo-funciones";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";
import type { SolicitudFuncion } from "@/lib/api/tipos";

/** Funciones adicionales del paquete: catálogo predefinido + negociación. */
export function EntornoPaqueteFunciones() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useModoEdicion();
  const esAdmin = usuario?.rol === "admin";
  const [solicitudes, setSolicitudes] = useState<SolicitudFuncion[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const cargar = (): void => {
    if (!id) return;
    api
      .solicitudesProyecto(id)
      .then((r) => setSolicitudes(r.solicitudes))
      .catch(() => setSolicitudes([]));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const responder = async (
    s: SolicitudFuncion,
    costo: number,
    texto: string,
  ): Promise<void> => {
    try {
      await api.responderSolicitud(s.id, { costo, respuestaAdmin: texto });
      cargar();
    } catch {
      setError("No se pudo responder la solicitud.");
    }
  };

  const pagar = async (s: SolicitudFuncion): Promise<void> => {
    try {
      const r = await api.aceptarSolicitud(s.id);
      window.location.href = `/cliente/pagar/${r.pago.id}`;
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => (window.location.href = `/cliente/paquetes/${id}`)}
      >
        <ArrowLeft className="size-4" /> Volver al resumen
      </Button>
      <h1 className="mt-3 text-2xl font-bold">Funciones adicionales</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada función suma su propia vista al proyecto. El equipo confirma el
        alcance y el costo antes de que pagues.
      </p>
      <NavEntorno familia="paquete" id={id ?? ""} activo="funciones" />
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {id && (
        <div className="mt-6">
          <CatalogoFunciones familia="proyecto" id={id} onSolicitada={cargar} />
        </div>
      )}

      <h2 className="mt-8 text-lg font-bold">Tus solicitudes</h2>
      <div className="mt-3">
        <ListaSolicitudes
          solicitudes={solicitudes}
          esAdmin={esAdmin}
          onResponder={responder}
          onPagar={pagar}
        />
      </div>
    </div>
  );
}
