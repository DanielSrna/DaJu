import { useState } from "react";
import { ArrowRight, Loader2, MailCheck, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/cliente";
import { useModoEdicion } from "@/lib/modo-edicion";
import type { TipoProducto } from "@/lib/api/tipos";

interface Props {
  tipo: TipoProducto;
  productoId: string;
  nombre: string;
  precio: number;
  moneda: string;
  abierto: boolean;
  onCambiar: (abierto: boolean) => void;
}

/** Texto GRATIS resaltado (verde, negrilla, mayúsculas) como pide la marca. */
function Gratis() {
  return (
    <strong className="font-bold uppercase text-green-600">gratis</strong>
  );
}

/** Mayoría de edad (18 años) calculada en el navegador. */
function esMayorDeEdad(fecha: string): boolean {
  const nacimiento = new Date(fecha);
  if (Number.isNaN(nacimiento.getTime())) return false;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const meses = hoy.getMonth() - nacimiento.getMonth();
  if (meses < 0 || (meses === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad -= 1;
  }
  return edad >= 18;
}

/**
 * Cotización desde la vitrina: registro completo (identidad, mayoría de edad
 * y aceptación de los dos contratos). No cobra: abre el entorno en la fase
 * de planeación y diseño (GRATIS).
 */
export function CotizarModal({
  tipo,
  productoId,
  nombre,
  precio,
  moneda,
  abierto,
  onCambiar,
}: Props) {
  const [form, setForm] = useState({
    nombre: "",
    segundoNombre: "",
    primerApellido: "",
    segundoApellido: "",
    fechaNacimiento: "",
    email: "",
    confirmarEmail: "",
    password: "",
    confirmarPassword: "",
  });
  const [aceptaCondiciones, setAceptaCondiciones] = useState(false);
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [emailRegistrado, setEmailRegistrado] = useState<string | null>(null);
  const { usuario } = useModoEdicion();
  const esClienteLogueado = usuario?.rol === "cliente";

  const campo = (
    clave: keyof typeof form,
    valor: string,
  ): void => setForm((f) => ({ ...f, [clave]: valor }));

  function validar(): boolean {
    const nuevos: Record<string, string> = {};
    if (form.nombre.trim().length < 2) nuevos.nombre = "Escribe tu nombre";
    if (form.primerApellido.trim().length < 2)
      nuevos.primerApellido = "Escribe tu primer apellido";
    if (!esMayorDeEdad(form.fechaNacimiento))
      nuevos.fechaNacimiento = "Debes ser mayor de edad (18+)";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      nuevos.email = "Email inválido";
    if (form.confirmarEmail.trim().toLowerCase() !== form.email.trim().toLowerCase())
      nuevos.confirmarEmail = "Los emails no coinciden";
    if (form.password.length < 8) nuevos.password = "Mínimo 8 caracteres";
    if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(form.password))
      nuevos.password = "Debe incluir letras y números";
    if (form.confirmarPassword !== form.password)
      nuevos.confirmarPassword = "Las contraseñas no coinciden";
    if (!aceptaCondiciones)
      nuevos.aceptaCondiciones = "Debes aceptar el contrato de condiciones";
    if (!aceptaDatos)
      nuevos.aceptaDatos = "Debes aceptar el contrato de manejo de datos";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  // Validación en vivo: confirma coincidencias y habilita el registro.
  const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());
  const emailsCoinciden =
    form.confirmarEmail.trim() !== "" &&
    form.confirmarEmail.trim().toLowerCase() ===
      form.email.trim().toLowerCase();
  const passwordValida =
    form.password.length >= 8 && /^(?=.*[a-zA-Z])(?=.*\d)/.test(form.password);
  const passwordsCoinciden =
    form.confirmarPassword !== "" && form.confirmarPassword === form.password;
  const formularioListo =
    form.nombre.trim().length >= 2 &&
    form.primerApellido.trim().length >= 2 &&
    esMayorDeEdad(form.fechaNacimiento) &&
    emailValido &&
    emailsCoinciden &&
    passwordValida &&
    passwordsCoinciden &&
    aceptaCondiciones &&
    aceptaDatos;

  async function cotizar(): Promise<void> {
    if (!validar()) return;
    setEnviando(true);
    setErrorGeneral(null);
    try {
      const resultado = await api.cotizar({
        tipoProducto: tipo,
        ...(tipo === "paquete" ? { paqueteId: productoId } : { productoId }),
        nombre: form.nombre,
        ...(form.segundoNombre.trim()
          ? { segundoNombre: form.segundoNombre }
          : {}),
        primerApellido: form.primerApellido,
        ...(form.segundoApellido.trim()
          ? { segundoApellido: form.segundoApellido }
          : {}),
        fechaNacimiento: form.fechaNacimiento,
        aceptaCondiciones,
        aceptaDatos,
        email: form.email,
        password: form.password,
      });
      setEmailRegistrado(resultado.usuario.email);
    } catch (e) {
      const err = e as Error & { code?: string };
      setErrorGeneral(err.message);
      if (err.code === "UNAUTHORIZED") {
        setErrores({
          password:
            "Ya existe una cuenta con este email: usa tu contraseña o inicia sesión.",
        });
      }
    } finally {
      setEnviando(false);
    }
  }

  /** Cliente con sesión: agrega el producto y entra directo a su entorno. */
  async function agregarComoCliente(): Promise<void> {
    setEnviando(true);
    setErrorGeneral(null);
    try {
      const resultado = await api.cotizarComoCliente({
        tipoProducto: tipo,
        ...(tipo === "paquete" ? { paqueteId: productoId } : { productoId }),
      });
      const familia =
        resultado.entorno.tipo === "proyecto"
          ? "paquetes"
          : tipo === "plantilla"
            ? "plantillas"
            : "servicios";
      window.location.href = `/cliente/${familia}/${resultado.entorno.id}`;
    } catch (e) {
      setErrorGeneral((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onCambiar}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {emailRegistrado ? (
          <div className="text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--brand-acento)]/15">
              <MailCheck className="size-6 text-[var(--brand-acento)]" />
            </span>
            <DialogHeader className="mt-4 items-center text-center sm:text-center">
              <DialogTitle>Revisa tu correo</DialogTitle>
              <DialogDescription>
                Te enviamos el enlace de confirmación a{" "}
                <strong className="text-foreground">{emailRegistrado}</strong>.
                Confírmalo y entra directo a tu entorno a empezar la fase de
                planeación y diseño.
              </DialogDescription>
            </DialogHeader>
            <Button
              variant="accent"
              className="mt-6 w-full"
              size="lg"
              onClick={() => (window.location.href = "/cliente")}
            >
              Ir a mi portal
              <ArrowRight />
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              La fase de planeación y diseño es completamente <Gratis />.
            </p>
          </div>
        ) : esClienteLogueado ? (
          <div className="text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100">
              <UserCheck className="size-6 text-green-700" />
            </span>
            <DialogHeader className="mt-4 items-center text-center sm:text-center">
              <DialogTitle>Agrega {nombre}</DialogTitle>
              <DialogDescription>
                Ya tienes sesión como{" "}
                <strong className="text-foreground">{usuario?.nombre}</strong>.
                Lo sumamos a tus entornos sin volver a registrarte; la fase de
                planeación y diseño sigue siendo <Gratis />.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-left">
              <p className="text-sm font-semibold">{nombre}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ${precio.toLocaleString("es-CO")} {moneda} · planeación y diseño{" "}
                <Gratis />
              </p>
            </div>

            {errorGeneral && (
              <p className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                {errorGeneral}
              </p>
            )}

            <Button
              variant="accent"
              size="lg"
              className="mt-5 w-full"
              disabled={enviando}
              onClick={() => void agregarComoCliente()}
            >
              {enviando ? <Loader2 className="animate-spin" /> : null}
              {enviando ? "Abriendo tu entorno..." : "Agregar a mis proyectos"}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Entras directo a tu entorno de planeación. No necesitas
              registrarte otra vez.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cotiza {nombre}</DialogTitle>
              <DialogDescription>
                Crea tu cuenta y empieza la{" "}
                <strong className="text-foreground">
                  fase de planeación y diseño
                </strong>
                , completamente <Gratis />. Pagas solo cuando acordemos el
                desarrollo por etapas.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-semibold">{nombre}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ${precio.toLocaleString("es-CO")} {moneda} · planeación y diseño{" "}
                <Gratis />
              </p>
            </div>

            {usuario?.rol === "admin" && (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                Estás como admin: usa otro correo o cierra sesión para cotizar
                como cliente.
              </p>
            )}

            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cotizar-nombre">Nombre</Label>
                  <Input
                    id="cotizar-nombre"
                    value={form.nombre}
                    onChange={(e) => campo("nombre", e.target.value)}
                    placeholder="Tu nombre"
                  />
                  {errores.nombre && (
                    <span className="text-xs text-destructive">
                      {errores.nombre}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cotizar-segundo-nombre">
                    Segundo nombre (opcional)
                  </Label>
                  <Input
                    id="cotizar-segundo-nombre"
                    value={form.segundoNombre}
                    onChange={(e) => campo("segundoNombre", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cotizar-primer-apellido">
                    Primer apellido
                  </Label>
                  <Input
                    id="cotizar-primer-apellido"
                    value={form.primerApellido}
                    onChange={(e) => campo("primerApellido", e.target.value)}
                    placeholder="Tu primer apellido"
                  />
                  {errores.primerApellido && (
                    <span className="text-xs text-destructive">
                      {errores.primerApellido}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cotizar-segundo-apellido">
                    Segundo apellido (opcional)
                  </Label>
                  <Input
                    id="cotizar-segundo-apellido"
                    value={form.segundoApellido}
                    onChange={(e) => campo("segundoApellido", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="cotizar-fecha-nacimiento">
                  Fecha de nacimiento
                </Label>
                <Input
                  id="cotizar-fecha-nacimiento"
                  type="date"
                  value={form.fechaNacimiento}
                  onChange={(e) => campo("fechaNacimiento", e.target.value)}
                />
                {errores.fechaNacimiento && (
                  <span className="text-xs text-destructive">
                    {errores.fechaNacimiento}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cotizar-email">Email</Label>
                  <Input
                    id="cotizar-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => campo("email", e.target.value)}
                    placeholder="tu@correo.com"
                  />
                  {errores.email && (
                    <span className="text-xs text-destructive">
                      {errores.email}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cotizar-confirmar-email">
                    Escribe de nuevo tu email
                  </Label>
                  <Input
                    id="cotizar-confirmar-email"
                    type="email"
                    value={form.confirmarEmail}
                    onChange={(e) => campo("confirmarEmail", e.target.value)}
                    placeholder="Repite tu correo"
                  />
                  {form.confirmarEmail ? (
                    <span
                      className={`text-xs ${
                        emailsCoinciden ? "text-green-600" : "text-destructive"
                      }`}
                    >
                      {emailsCoinciden
                        ? "Los emails coinciden ✓"
                        : "Los emails no coinciden"}
                    </span>
                  ) : (
                    errores.confirmarEmail && (
                      <span className="text-xs text-destructive">
                        {errores.confirmarEmail}
                      </span>
                    )
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cotizar-password">Contraseña</Label>
                  <Input
                    id="cotizar-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => campo("password", e.target.value)}
                    placeholder="Mínimo 8, con letras y números"
                  />
                  {errores.password && (
                    <span className="text-xs text-destructive">
                      {errores.password}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cotizar-confirmar-password">
                    Escribe de nuevo tu contraseña
                  </Label>
                  <Input
                    id="cotizar-confirmar-password"
                    type="password"
                    value={form.confirmarPassword}
                    onChange={(e) => campo("confirmarPassword", e.target.value)}
                    placeholder="Repite tu contraseña"
                  />
                  {form.confirmarPassword ? (
                    <span
                      className={`text-xs ${
                        passwordsCoinciden
                          ? "text-green-600"
                          : "text-destructive"
                      }`}
                    >
                      {passwordsCoinciden
                        ? "Las contraseñas coinciden ✓"
                        : "Las contraseñas no coinciden"}
                    </span>
                  ) : (
                    errores.confirmarPassword && (
                      <span className="text-xs text-destructive">
                        {errores.confirmarPassword}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <ShieldCheck className="size-4 text-green-600" />
                  Para registrarte debes aceptar los dos contratos
                </p>
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={aceptaCondiciones}
                    onChange={(e) => setAceptaCondiciones(e.target.checked)}
                  />
                  <span>
                    Acepto el{" "}
                    <a
                      href="/contratos/condiciones"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[var(--brand-primario)] underline"
                    >
                      contrato de condiciones del servicio
                    </a>
                  </span>
                </label>
                {errores.aceptaCondiciones && (
                  <span className="text-xs text-destructive">
                    {errores.aceptaCondiciones}
                  </span>
                )}
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={aceptaDatos}
                    onChange={(e) => setAceptaDatos(e.target.checked)}
                  />
                  <span>
                    Acepto el{" "}
                    <a
                      href="/contratos/datos"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[var(--brand-primario)] underline"
                    >
                      contrato de manejo de datos personales
                    </a>
                  </span>
                </label>
                {errores.aceptaDatos && (
                  <span className="text-xs text-destructive">
                    {errores.aceptaDatos}
                  </span>
                )}
              </div>
            </div>

            {errorGeneral && (
              <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                {errorGeneral}
              </p>
            )}

            <Button
              variant="accent"
              size="lg"
              className="w-full"
              disabled={enviando || !formularioListo}
              onClick={() => void cotizar()}
            >
              {enviando ? <Loader2 className="animate-spin" /> : null}
              {enviando ? "Creando tu entorno..." : "Cotizar y crear mi cuenta"}
            </Button>
            {!formularioListo && (
              <p className="text-center text-[11px] text-muted-foreground">
                Completa tus datos, confirma correo y contraseña, y acepta los
                dos contratos para habilitar el registro.
              </p>
            )}
            <p className="text-center text-[11px] text-muted-foreground">
              Sin pago ahora. Te asesoramos <Gratis /> y luego decides.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
