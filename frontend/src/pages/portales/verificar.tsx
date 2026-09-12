import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Loader2, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";

/** Confirmación del correo desde el enlace enviado al registrarse. */
export function Verificar() {
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">(
    "cargando",
  );
  const [mensaje, setMensaje] = useState("");
  const { usuario, recargar } = useModoEdicion();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setEstado("error");
      setMensaje("El enlace no trae un token de verificación.");
      return;
    }
    api
      .verificarEmail(token)
      .then(async () => {
        setEstado("ok");
        if (usuario) await recargar();
      })
      .catch((e) => {
        setEstado("error");
        setMensaje((e as Error).message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      {estado === "cargando" && (
        <Loader2 className="mx-auto size-10 animate-spin text-muted-foreground" />
      )}
      {estado === "ok" && (
        <>
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100">
            <BadgeCheck className="size-7 text-green-700" />
          </span>
          <h1 className="mt-4 text-2xl font-bold">Correo confirmado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta está lista. Entra a tu entorno y empecemos la fase de
            planeación y diseño — completamente gratis.
          </p>
          <Button
            variant="accent"
            size="lg"
            className="mt-6"
            onClick={() => (window.location.href = "/cliente")}
          >
            Ir a mi portal
            <ArrowRight />
          </Button>
        </>
      )}
      {estado === "error" && (
        <>
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10">
            <MailWarning className="size-7 text-destructive" />
          </span>
          <h1 className="mt-4 text-2xl font-bold">No pudimos confirmar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mensaje || "El enlace no es válido o ya expiró."}
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => (window.location.href = "/cliente")}
          >
            Ir a mi portal
          </Button>
        </>
      )}
    </div>
  );
}

export default Verificar;
