import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  Award,
  Cloud,
  CreditCard,
  Database,
  Instagram,
  Linkedin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

const CALIDAD = [
  {
    icono: Award,
    texto: "ISO/IEC 25000 · Calidad de producto",
  },
  {
    icono: ShieldCheck,
    texto: "Procesos alineados a ISO 9001",
  },
  {
    icono: Cloud,
    texto: "Google Quality and Software Testing",
  },
  {
    icono: Database,
    texto: "MongoDB Certified Developer Associate",
  },
];

const REDES = [
  { icono: Instagram, nombre: "Instagram", url: "#" },
  { icono: Linkedin, nombre: "LinkedIn", url: "#" },
  { icono: MessageCircle, nombre: "WhatsApp", url: "#" },
];

/** Botón flotante: aparece al llegar (cerca) del final de la página. */
function VolverArriba() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alDesplazar = (): void => {
      const cercaDelFinal =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 480;
      setVisible(cercaDelFinal);
    };
    window.addEventListener("scroll", alDesplazar, { passive: true });
    alDesplazar();
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  return (
    <button
      type="button"
      aria-label="Volver arriba"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-5 right-5 z-40 flex size-10 items-center justify-center rounded-full bg-[var(--brand-primario)] text-white shadow-lg transition-all hover:bg-[var(--brand-primario)]/90 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <ArrowUp className="size-5" />
    </button>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 bg-[var(--brand-primario)] py-10 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold">
            DaJu <span className="text-[var(--brand-acento)]">·</span> Agencia web
          </p>
          <p className="mt-2 text-sm text-white/60">
            Webs profesionales, mini-dashboards y consultoría para negocios que
            quieren vender más.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {CALIDAD.map(({ icono: Icono, texto }) => (
              <span
                key={texto}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/85"
              >
                <Icono className="size-3 text-[var(--brand-acento)]" />
                {texto}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/85">
              <CreditCard className="size-3 text-[var(--brand-acento)]" />
              Pagos seguros con pasarela
            </span>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/50">
            Vitrina
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li><Link className="hover:text-[var(--brand-acento)]" to="/productos">Productos</Link></li>
            <li><Link className="hover:text-[var(--brand-acento)]" to="/blog">Blog</Link></li>
            <li><Link className="hover:text-[var(--brand-acento)]" to="/faq">FAQ</Link></li>
            <li><Link className="hover:text-[var(--brand-acento)]" to="/postventa">Servicios post-venta</Link></li>
            <li><Link className="hover:text-[var(--brand-acento)]" to="/contacto">Contacto</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/50">
            Clientes
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>
              <Link className="hover:text-[var(--brand-acento)]" to="/cliente/login">
                Iniciar sesión
              </Link>
            </li>
            <li>
              <Link className="hover:text-[var(--brand-acento)]" to="/terminos">
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link className="hover:text-[var(--brand-acento)]" to="/privacidad">
                Política de privacidad
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/50">
            Síguenos
          </p>
          <div className="mt-3 flex gap-2">
            {REDES.map(({ icono: Icono, nombre }) => (
              <a
                key={nombre}
                href="#"
                aria-label={nombre}
                title={`${nombre} (muy pronto)`}
                className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <Icono className="size-4" />
              </a>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/50">
            Nuestras redes llegan muy pronto.
          </p>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-white/10 px-4 pt-6 text-xs text-white/40">
        © {new Date().getFullYear()} DaJu. Todos los derechos reservados · Hecho
        bajo el estándar ISO/IEC 25000.
      </div>
      <VolverArriba />
    </footer>
  );
}
