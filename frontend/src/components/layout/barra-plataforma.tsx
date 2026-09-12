import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Hammer, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModoEdicion } from "@/lib/modo-edicion";
import { api } from "@/lib/api/cliente";

/**
 * Barra superior de la plataforma (dentro de /cliente):
 * reemplaza vitrina (TopBar + Marquesina + Navbar). El logo vuelve a la vitrina.
 */
export function BarraPlataforma() {
  const { usuario, recargar } = useModoEdicion();
  const navigate = useNavigate();
  const [cerrando, setCerrando] = useState(false);
  const [sinLeer, setSinLeer] = useState(0);

  const contar = (): void => {
    api
      .notificacionesSinLeer()
      .then((r) => setSinLeer(r.total))
      .catch(() => null);
  };

  useEffect(() => {
    if (!usuario) return;
    contar();
    const id = setInterval(contar, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  const cerrarSesion = async (): Promise<void> => {
    setCerrando(true);
    try {
      await api.logout();
      await recargar();
      navigate("/");
    } catch {
      await recargar();
    } finally {
      setCerrando(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--brand-primario)] text-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          to="/cliente"
          aria-label="Ir al inicio de la plataforma"
          className="flex items-center gap-2 rounded-lg px-1 py-1 transition-opacity hover:opacity-85"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-white text-lg font-black text-[var(--brand-primario)]">
            D
          </span>
          <span className="text-lg font-bold">DaJu</span>
          <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/60">
            Plataform
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {usuario && (<Link
            to="/cliente/notificaciones"
            aria-label={`Notificaciones (${sinLeer} sin leer)`}
            className="relative flex size-9 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/10"
          >
            <Bell className="size-4.5" />
            {sinLeer > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {sinLeer > 9 ? "9+" : sinLeer}
              </span>
            )}
          </Link>)}
          {usuario ? (
            <>
              <span className="hidden items-center gap-1.5 text-xs text-white/80 sm:inline-flex">
                <Hammer className="size-3.5 text-[var(--brand-acento)]" />
                {usuario.nombre}
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {usuario.rol === "admin" ? "Admin" : "Cliente"}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={cerrando}
                onClick={() => void cerrarSesion()}
                aria-label="Cerrar sesión"
                className="h-8 gap-1 text-white/90 hover:bg-white/10 hover:text-white"
              >
                {cerrando ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <LogOut className="size-3.5" />
                )}
                <span className="hidden sm:inline">Cerrar sesión</span>
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
