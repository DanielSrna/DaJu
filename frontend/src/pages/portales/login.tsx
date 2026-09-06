import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";

/**
 * Pantalla de acceso a la plataforma. Tras un login exitoso:
 * - rol admin → vuelve a la vitrina en modo edición (lapices + dock).
 * - rol cliente → se queda en el portal de cliente (próximamente).
 */
export function Login() {
  const navigate = useNavigate();
  const { recargar } = useModoEdicion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ver, setVer] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await api.login({ email, password });
      await recargar(); // refresca la sesión de la TopBar/ModoEdicion
      navigate(res.user.rol === "admin" ? "/" : "/cliente");
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo iniciar sesión";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-[var(--brand-primario)] text-2xl font-black text-[var(--brand-acento)]">
          D
        </span>
        <h1 className="mt-4 text-2xl font-bold">Inicia sesión</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Accede a la plataforma DaJu y a tu proyecto.
        </p>
      </div>

      <form
        onSubmit={(e) => void enviar(e)}
        className="mt-8 space-y-4 rounded-2xl border bg-card p-6 shadow-sm"
      >
        <label className="block text-sm font-medium">
          Correo electrónico
          <input
            type="email"
            autoComplete="email"
            required
            aria-label="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-focus focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>

        <label className="block text-sm font-medium">
          Contraseña
          <div className="relative mt-1.5">
            <input
              type={ver ? "text" : "password"}
              autoComplete="current-password"
              required
              aria-label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-focus focus:ring-2 focus:ring-[var(--brand-acento)]"
            />
            <button
              type="button"
              aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setVer((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[var(--brand-primario)]"
            >
              {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="accent" className="w-full" disabled={cargando}>
          {cargando ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          Ingresar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta? Compra un paquete y la creamos automáticamente
      </p>
      <div className="mt-2 text-center">
        <Link to="/productos" className="text-sm font-semibold text-[var(--brand-primario)] underline underline-offset-4 hover:text-[var(--brand-acento)]">
          Ver productos →
        </Link>
      </div>
    </div>
  );
}
