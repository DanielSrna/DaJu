import { useState } from "react";
import { Loader2, MailCheck, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";

/**
 * Muro del portal: sin correo verificado no se entra al entorno.
 * Permite reenviar el enlace y cerrar sesión.
 */
export function MuroVerificacion() {
  const { usuario } = useModoEdicion();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const reenviar = async (): Promise<void> => {
    if (!usuario) return;
    setEnviando(true);
    try {
      await api.reenviarVerificacion(usuario.email);
      setEnviado(true);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--brand-acento)]/15">
        <MailCheck className="size-7 text-[var(--brand-acento)]" />
      </span>
      <h1 className="mt-4 text-2xl font-bold">Confirma tu correo</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Te enviamos un enlace de confirmación a{" "}
        <strong className="text-foreground">{usuario?.email}</strong>. Al
        confirmarlo desbloqueas tu entorno y la fase de planeación y diseño
        gratis.
      </p>

      <Button
        variant="accent"
        className="mt-6"
        disabled={enviando || enviado}
        onClick={() => void reenviar()}
      >
        {enviando ? (
          <Loader2 className="animate-spin" />
        ) : (
          <RefreshCcw />
        )}
        {enviado ? "Enlace reenviado ✓" : "Reenviar el enlace"}
      </Button>
      <button
        type="button"
        className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:underline"
        onClick={async () => {
          await fetch("/api/v1/auth/logout", {
            method: "POST",
            credentials: "include",
          });
          window.location.href = "/";
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
