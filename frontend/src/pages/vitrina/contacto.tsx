import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";

export function Contacto() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    asunto: "",
    mensaje: "",
    _website: "",
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<"idle" | "ok" | "error">("idle");
  const [mensajeError, setMensajeError] = useState("");

  function validar(): boolean {
    const nuevos: Record<string, string> = {};
    if (form.nombre.trim().length < 2) nuevos.nombre = "Escribe tu nombre";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) nuevos.email = "Email inválido";
    if (form.mensaje.trim().length < 10)
      nuevos.mensaje = "Cuéntanos un poco más (mínimo 10 caracteres)";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function enviar() {
    if (!validar()) return;
    setEnviando(true);
    setEstado("idle");
    try {
      // El honeypot se envía vacío: si un bot lo llena, el backend lo rechaza.
      await api.contacto({
        nombre: form.nombre,
        email: form.email,
        asunto: form.asunto || undefined,
        mensaje: form.mensaje,
        _website: form._website,
      });
      setEstado("ok");
      setForm({ nombre: "", email: "", asunto: "", mensaje: "", _website: "" });
    } catch {
      setEstado("error");
      setMensajeError("No pudimos enviar tu mensaje. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-3xl font-bold">Contacto</h1>
      <p className="mt-2 text-muted-foreground">
        Cuéntanos tu idea o pide una cotización: te responderemos a tu correo.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        {/* Honeypot oculto para bots */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
          aria-hidden="true"
          value={form._website}
          onChange={(e) => setForm({ ...form, _website: e.target.value })}
        />

        <label className="block">
          <span className="text-sm font-medium">Nombre</span>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          {errores.nombre && (
            <span className="text-xs text-red-600">{errores.nombre}</span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {errores.email && <span className="text-xs text-red-600">{errores.email}</span>}
        </label>

        <label className="block">
          <span className="text-sm font-medium">Asunto</span>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.asunto}
            onChange={(e) => setForm({ ...form, asunto: e.target.value })}
          >
            <option value="">Selecciona (opcional)</option>
            <option value="Cotización">Cotización de proyecto</option>
            <option value="Duda sobre productos">Duda sobre productos</option>
            <option value="Soporte">Soporte / post-venta</option>
            <option value="Otro">Otro</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Mensaje</span>
          <textarea
            rows={6}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.mensaje}
            onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
            placeholder="Cuéntanos qué necesitas..."
          />
          {errores.mensaje && (
            <span className="text-xs text-red-600">{errores.mensaje}</span>
          )}
        </label>

        {estado === "ok" && (
          <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            ¡Mensaje enviado! Te responderemos pronto a tu correo.
          </p>
        )}
        {estado === "error" && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{mensajeError}</p>
        )}

        <Button type="submit" variant="accent" size="lg" disabled={enviando} className="w-full">
          {enviando ? <Loader2 className="animate-spin" /> : <Send />}
          {enviando ? "Enviando..." : "Enviar mensaje"}
        </Button>
      </form>
    </div>
  );
}
