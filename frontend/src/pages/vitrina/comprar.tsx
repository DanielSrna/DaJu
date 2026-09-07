import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Loader2, Minus, Plus, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/cliente";
import { useTema } from "@/lib/tema";
import { descuentoAplicable, precioConDescuento } from "@/lib/cms";
import type {
  FuncionalidadExtra,
  Plantilla,
  Paquete,
  Servicio,
  TipoProducto,
} from "@/lib/api/tipos";

const COMPLEJIDAD_LABEL: Record<FuncionalidadExtra["complejidad"], string> = {
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
};

const CATEGORIA_LABEL: Record<FuncionalidadExtra["categoria"], string> = {
  integraciones: "Integraciones",
  pagina: "Funcionalidades de página",
  usuarios: "Usuarios y cuentas",
  datos: "Automatización y datos",
};

const MAX_SESIONES = 10;

interface ItemVitrina {
  id: string;
  nombre: string;
  slug: string;
  precio: number;
  moneda: string;
  descripcion: string;
}

interface Props {
  tipo: TipoProducto;
}

const RUTAS: Record<TipoProducto, string> = {
  paquete: "/productos",
  plantilla: "/plantillas",
  servicio: "/servicios",
};

async function cargarItem(
  tipo: TipoProducto,
  slug: string,
): Promise<ItemVitrina> {
  if (tipo === "plantilla") {
    const r = await api.plantillaPorSlug(slug);
    const p = r.plantilla as Plantilla;
    return {
      id: p.id,
      nombre: p.nombre,
      slug: p.slug,
      precio: p.precio,
      moneda: p.moneda,
      descripcion: p.descripcion,
    };
  }
  if (tipo === "servicio") {
    const r = await api.servicioPorSlug(slug);
    const s = r.servicio as Servicio;
    return {
      id: s.id,
      nombre: s.nombre,
      slug: s.slug,
      precio: s.precio,
      moneda: s.moneda,
      descripcion: s.descripcion,
    };
  }
  const r = await api.paquetePorSlug(slug);
  const p = r.paquete as Paquete;
  return {
    id: p.id,
    nombre: p.nombre,
    slug: p.slug,
    precio: p.precio,
    moneda: p.moneda,
    descripcion: p.descripcion,
  };
}

export function Comprar({ tipo }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<ItemVitrina | null>(null);
  const [catalogo, setCatalogo] = useState<FuncionalidadExtra[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [negociar, setNegociar] = useState(false);
  const [sesiones, setSesiones] = useState(1);

  const [form, setForm] = useState({ nombre: "", email: "", password: "" });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [mostrarFuga, setMostrarFuga] = useState(false);
  const [motivoFuga, setMotivoFuga] = useState("");
  const [fugaEnviado, setFugaEnviado] = useState(false);

  const conExtras = tipo === "paquete" || tipo === "plantilla";

  useEffect(() => {
    if (!slug) return;
    cargarItem(tipo, slug)
      .then(setItem)
      .catch(() => setErrorGeneral("No encontramos este producto."));
    if (conExtras) {
      void api
        .funcionalidades()
        .then((r) => setCatalogo(r.funcionalidades))
        .catch(() => setCatalogo([]));
    }
  }, [slug, tipo, conExtras]);

  const porCategoria = useMemo(() => {
    const grupos = new Map<string, FuncionalidadExtra[]>();
    for (const f of catalogo) {
      const lista = grupos.get(f.categoria) ?? [];
      lista.push(f);
      grupos.set(f.categoria, lista);
    }
    return grupos;
  }, [catalogo]);

  const totalExtras = useMemo(
    () =>
      catalogo
        .filter((f) => seleccionadas.has(f.id))
        .reduce((suma, f) => suma + f.precio, 0),
    [catalogo, seleccionadas],
  );

  const { cms } = useTema();
  const conDescuento =
    tipo !== "servicio" && descuentoAplicable(cms) && item != null;
  const precioBase = item
    ? conDescuento
      ? precioConDescuento(item.precio, cms.descuento.porcentaje)
      : item.precio
    : 0;
  const total =
    tipo === "servicio" ? precioBase * sesiones : precioBase + totalExtras;

  function alternar(id: string) {
    setSeleccionadas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function validar(): boolean {
    const nuevos: Record<string, string> = {};
    if (form.nombre.trim().length < 2) nuevos.nombre = "Escribe tu nombre";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) nuevos.email = "Email inválido";
    if (form.password.length < 8) nuevos.password = "Mínimo 8 caracteres";
    if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(form.password))
      nuevos.password = "Debe incluir letras y números";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function pagar() {
    if (!item || !validar()) return;
    setEnviando(true);
    setErrorGeneral(null);
    try {
      const resultado = await api.checkout({
        tipoProducto: tipo,
        ...(tipo === "paquete" ? { paqueteId: item.id } : { productoId: item.id }),
        ...(tipo === "servicio" ? { cantidad: sesiones } : {}),
        ...(conExtras ? { funcionalidades: [...seleccionadas], negociarDespues: negociar } : {}),
        nombre: form.nombre,
        email: form.email,
        password: form.password,
      });
      if (resultado.urlPago) {
        window.location.href = resultado.urlPago;
        return;
      }
      setExito(
        "Tu pago quedó registrado. Cuando la pasarela esté activa recibirás el enlace para pagar.",
      );
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

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p>{errorGeneral ?? "Cargando..."}</p>
      </div>
    );
  }

  const titulo =
    tipo === "servicio" ? "Reserva tus sesiones" : "Personaliza y compra";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`${RUTAS[tipo]}/${slug}`)}
      >
        ← Volver al producto
      </Button>
      <h1 className="mt-4 text-3xl font-bold">{titulo}</h1>
      <p className="mt-1 text-muted-foreground">
        <strong>{item.nombre}</strong> —{" "}
        {tipo === "servicio"
          ? `${item.precio} USD por sesión de 60 min`
          : `base $${item.precio} USD. Suma funcionalidades (cada una incluye su propia vista).`}
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          {tipo === "servicio" ? (
            <section>
              <h2 className="text-lg font-semibold">Cantidad de sesiones</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Puedes reservar hasta {MAX_SESIONES} sesiones de golpe. Agendaríamos
                cada una en el canal del servicio; las que no uses no se cobran
                duplicadas: puedes reagendar.
              </p>
              <div className="mt-4 flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Menos sesiones"
                  disabled={sesiones <= 1}
                  onClick={() => setSesiones((s) => Math.max(1, s - 1))}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="min-w-16 text-center text-2xl font-bold">
                  {sesiones}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Más sesiones"
                  disabled={sesiones >= MAX_SESIONES}
                  onClick={() => setSesiones((s) => Math.min(MAX_SESIONES, s + 1))}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </section>
          ) : (
            <>
              {/* Selector de funcionalidades */}
              <h2 className="text-lg font-semibold">Funcionalidades adicionales</h2>
              {catalogo.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  (El catálogo aún no tiene funcionalidades cargadas.)
                </p>
              )}
              <div className="mt-4 space-y-6">
                {[...porCategoria.entries()].map(([categoria, items]) => (
                  <section key={categoria}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {CATEGORIA_LABEL[categoria as FuncionalidadExtra["categoria"]]}
                    </h3>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {items.map((f) => {
                        const activa = seleccionadas.has(f.id);
                        return (
                          <label
                            key={f.id}
                            className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 transition-colors ${
                              activa
                                ? "border-[var(--brand-acento)] bg-[var(--brand-acento)]/10"
                                : "hover:bg-muted"
                            }`}
                          >
                            <span>
                              <span className="block text-sm font-medium">{f.nombre}</span>
                              <span className="block text-xs text-muted-foreground">
                                {COMPLEJIDAD_LABEL[f.complejidad]} · ${f.precio} USD
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              className="mt-1 size-4 accent-[var(--brand-acento)]"
                              checked={activa}
                              onChange={() => alternar(f.id)}
                              aria-label={f.nombre}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-lg border p-4">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--brand-acento)]"
                  checked={negociar}
                  onChange={(e) => setNegociar(e.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium">
                    No encontré la funcionalidad que necesito
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Compra el producto base y negociamos el costo de tu funcionalidad
                    especial después del pago.
                  </span>
                </span>
              </label>
            </>
          )}
        </div>

        {/* Resumen + registro */}
        <aside className="h-fit rounded-xl border bg-card p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="font-bold">Resumen</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>
                {item.nombre}
                {tipo === "servicio" && sesiones > 1 && (
                  <span className="ml-1 text-muted-foreground">× {sesiones}</span>
                )}
              </dt>
              <dd>
                ${precioBase.toLocaleString("es-CO")} USD
                {conDescuento && (
                  <span className="ml-1.5 text-xs text-muted-foreground line-through opacity-55">
                    ${item.precio} USD
                  </span>
                )}
              </dd>
            </div>
            {conDescuento && (
              <div className="flex justify-between text-xs font-semibold text-red-700">
                <dt>Descuento de la semana (-{cms.descuento.porcentaje}%)</dt>
                <dd>aplicado ✓</dd>
              </div>
            )}
            {seleccionadas.size > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>{seleccionadas.size} funcionalidad(es)</dt>
                <dd>${totalExtras.toLocaleString("es-CO")} USD</dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>${total.toLocaleString("es-CO")} USD</dd>
            </div>
          </dl>

          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="text-xs font-medium">Nombre</span>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Tu nombre"
              />
              {errores.nombre && (
                <span className="text-xs text-red-600">{errores.nombre}</span>
              )}
            </label>
            <label className="block">
              <span className="text-xs font-medium">Email</span>
              <input
                type="email"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@correo.com"
              />
              {errores.email && <span className="text-xs text-red-600">{errores.email}</span>}
            </label>
            <label className="block">
              <span className="text-xs font-medium">Contraseña</span>
              <input
                type="password"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 8, con letras y números"
              />
              {errores.password && (
                <span className="text-xs text-red-600">{errores.password}</span>
              )}
            </label>
          </div>

          {errorGeneral && (
            <p className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">
              {errorGeneral}
            </p>
          )}
          {exito && (
            <p className="mt-3 flex items-start gap-2 rounded-md bg-green-50 p-2 text-xs text-green-700">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              {exito}
            </p>
          )}

          <Button
            className="mt-5 w-full"
            variant="accent"
            size="lg"
            disabled={enviando}
            onClick={pagar}
          >
            {enviando ? <Loader2 className="animate-spin" /> : null}
            {enviando
              ? "Creando tu pedido..."
              : tipo === "servicio"
                ? `Pagar ${sesiones} sesión(es) · $${total} USD`
                : `Pagar $${total} USD`}
          </Button>
          <button
            type="button"
            onClick={() => setMostrarFuga((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-[var(--brand-primario)]"
          >
            <HelpCircle className="size-3.5" />
            ¿Algo te detiene? Cuéntanos
          </button>
          {mostrarFuga && (
            <div className="mt-2 rounded-lg border p-3">
              <textarea
                aria-label="Motivo"
                rows={2}
                placeholder="Precio, dudas, plazos… (te respondemos por correo)"
                value={motivoFuga}
                onChange={(e) => setMotivoFuga(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                disabled={!motivoFuga.trim() || fugaEnviado}
                onClick={async () => {
                  try {
                    await api.contacto({
                      nombre: form.nombre || "Visitante",
                      email: form.email || "sin-correo@daju.co",
                      asunto: "Fuga de compra",
                      mensaje: `${item.nombre} \u2014 ${motivoFuga.trim()}`,
                    });
                    setFugaEnviado(true);
                  } catch {
                    setErrorGeneral("No pudimos enviar tu mensaje.");
                  }
                }}
              >
                {fugaEnviado ? "Enviado ✓" : "Enviar"}
              </Button>
            </div>
          )}
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {tipo === "servicio"
              ? "Creas tu cuenta y te enviamos el enlace de pago; luego agendamos tus citas."
              : "Crearás tu cuenta de cliente y te enviaremos el enlace de pago."}
          </p>
        </aside>
      </div>
    </div>
  );
}

export default Comprar;
