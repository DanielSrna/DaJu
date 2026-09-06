import { Link } from "react-router-dom";
import { LogIn, ExternalLink, Pencil, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTema } from "@/lib/tema";
import { useModoEdicion } from "@/lib/modo-edicion";

const ENLACES = [
  { nombre: "Inicio", ruta: "/" },
  { nombre: "Productos", ruta: "/productos" },
  { nombre: "Blog", ruta: "/blog" },
  { nombre: "FAQ", ruta: "/faq" },
  { nombre: "Servicios post-venta", ruta: "/postventa" },
  { nombre: "Contacto", ruta: "/contacto" },
];

/** Barra superior: zona de acceso a la plataforma, separada de la vitrina.
 *  Con admin logueado se vuelve "modo diseñador": Edición (activa) y Desarrollo. */
export function TopBar() {
  const { modoEdicion } = useModoEdicion();

  return (
    <div className="bg-[var(--brand-primario)] text-white">
      <div className="mx-auto flex h-8 max-w-6xl items-center justify-end gap-3 px-4 text-xs">
        {modoEdicion ? (
          <>
            <span className="font-semibold text-white/90">
              Bienvenido Administrador
            </span>
            <div className="flex gap-1">
              <Button
                asChild
                variant="ghost"
                size="sm"
                aria-current="page"
                className="h-6 gap-1 bg-white/15 text-white hover:bg-white/25 hover:text-white"
              >
                <Link to="/">
                  <Pencil className="size-3" />
                  Edición
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-white/90 hover:bg-white/10 hover:text-white"
              >
                <Link to="/admin">
                  <Hammer className="size-3" />
                  Desarrollo
                </Link>
              </Button>            </div>
          </>
        ) : (
          <>
            <span className="text-white/70">¿Ya tienes un proyecto con nosotros?</span>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/cliente/login">
                <LogIn className="size-3" />
                Iniciar sesión
                <ExternalLink className="size-3 opacity-60" />
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** Barra de navegación de la vitrina. */
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-[var(--brand-primario)] text-lg font-black text-[var(--brand-acento)]">
            D
          </span>
          <span className="text-xl font-bold tracking-tight text-[var(--brand-primario)]">
            DaJu
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {ENLACES.map((enlace) => (
            <Button key={enlace.ruta} asChild variant="ghost" size="sm">
              <Link to={enlace.ruta}>{enlace.nombre}</Link>
            </Button>
          ))}
        </nav>

        <Button asChild variant="accent" className="hidden md:inline-flex">
          <Link to="/contacto">Cotizar proyecto</Link>
        </Button>
      </div>

      {/* Navegación móvil */}
      <nav
        aria-label="Principal móvil"
        className="flex justify-center gap-1 overflow-x-auto border-t px-2 py-1 md:hidden"
      >
        {ENLACES.map((enlace) => (
          <Button key={enlace.ruta} asChild variant="ghost" size="sm">
            <Link to={enlace.ruta}>{enlace.nombre}</Link>
          </Button>
        ))}
      </nav>
    </header>
  );
}

export function Marquesina() {
  const { cms } = useTema();
  const propio = cms.marquesina?.texto?.trim();
  const conDescuento = cms.descuento?.activo ?? false;
  const mensajeDescuento = cms.descuento?.mensaje?.trim() ?? "";
  const texto = propio || (conDescuento ? mensajeDescuento : "");
  if (!cms.marquesina?.activo || !texto) return null;

  // Texto repetido para llenar el ancho y lograr el loop infinito.
  const ciclo = Array.from({ length: 8 }, () => texto).join("  ·  ");

  return (
    <div
      className="marquesina-contenedor bg-[var(--brand-acento)] py-1.5"
      aria-label={`Anuncio: ${texto}`}
    >
      <div className="marquesina-track text-sm font-semibold text-[var(--brand-primario)]">
        {/* Dos copias idénticas para que el desplazamiento sea continuo */}
        <span className="whitespace-nowrap px-2">{ciclo}</span>
        <span className="whitespace-nowrap px-2" aria-hidden="true">
          {ciclo}
        </span>
      </div>
    </div>
  );
}
