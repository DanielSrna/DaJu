import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";

/** Solicitar restablecimiento de contraseña (correo). */
export function Recuperar() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.forgot(email);
      setMensaje(
        "Si el correo existe, recibirás un enlace para restablecer tu contraseña (válido 30 min).",
      );
      setEmail("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <h1 className="text-2xl font-bold">Recupera tu contraseña</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Escribe tu correo y te enviamos un enlace temporal.
      </p>
      <form onSubmit={(e) => void enviar(e)} className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <label className="block text-sm font-medium">
          Correo electrónico
          <input
            type="email"
            required
            aria-label="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>
        {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="accent" className="w-full" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link to="/cliente/login" className="font-semibold text-[var(--brand-primario)] underline underline-offset-4">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}

/** Nueva contraseña con el token recibido por correo. */
export function Restablecer() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.reset(token, password);
      navigate("/cliente/login");
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-lg font-semibold">Enlace inválido</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Solicita un nuevo enlace desde «Recupera tu contraseña».
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <h1 className="text-2xl font-bold">Nueva contraseña</h1>
      <form onSubmit={(e) => void enviar(e)} className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <label className="block text-sm font-medium">
          Contraseña nueva
          <input
            type="password"
            required
            aria-label="Contraseña"
            placeholder="Mínimo 8, con letras y números"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-acento)]"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="accent" className="w-full" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </div>
  );
}
