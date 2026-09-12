import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogIn, ExternalLink, Pencil, Hammer, LogOut, Menu, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTema } from "@/lib/tema";
import { useModoEdicion } from "@/lib/modo-edicion";
import { api } from "@/lib/api/cliente";

const ENLACES = [
  { nombre: "Inicio", ruta: "/" },
  { nombre: "Productos", ruta: "/productos" },
  { nombre: "Blog", ruta: "/blog" },
  { nombre: "FAQ", ruta: "/faq" },
  { nombre: "Servicios post-venta", ruta: "/postventa" },
  { nombre: "Contacto", ruta: "/contacto" },
];

/** Barra superior: zona de acceso a la plataforma, separada de la vitrina.
 *  Con admin logueado se vuelve "modo diseñador": Edición (activa) y Desarrollo.
 *  Cualquier usuario autenticado tiene aquí su botón de cerrar sesión. */
export function TopBar() {
  const { modoEdicion, usuario, recargar } = useModoEdicion();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [cerrando, setCerrando] = useState(false);
  const planetaPortal = pathname.startsWith("/cliente");

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
    <div className="bg-[var(--brand-primario)] text-white">
      <div className="mx-auto flex h-8 max-w-6xl items-center justify-end gap-2 px-4 text-xs">
        {usuario ? (
          <>
            <span className="hidden font-semibold text-white/90 sm:inline">
              {modoEdicion ? "Bienvenido Administrador" : `Hola, ${usuario.nombre}`}
            </span>
            {modoEdicion && (
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
                  aria-current={planetaPortal ? "page" : undefined}
                  className={`h-6 gap-1 text-white/90 hover:bg-white/10 hover:text-white ${
                    planetaPortal ? "bg-white/15" : ""
                  }`}
                >
                  <Link to="/cliente">
                    <Hammer className="size-3" />
                    Desarrollo
                  </Link>
                </Button>
              </div>
            )}
            {!modoEdicion && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-6 gap-1 bg-white/15 text-white hover:bg-white/25 hover:text-white"
              >
                <Link to="/cliente">
                  <Hammer className="size-3" />
                  Ir a DaJu Plataform
                  <ExternalLink className="size-3 opacity-60" />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={cerrando}
              onClick={() => void cerrarSesion()}
              aria-label="Cerrar sesión"
              className="h-6 gap-1 text-white/90 hover:bg-white/10 hover:text-white"
            >
              {cerrando ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <LogOut className="size-3" />
              )}
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          </>
        ) : (
          <>
            <span className="hidden whitespace-nowrap text-white/70 sm:inline">
              ¿Ya tienes un proyecto con nosotros?
            </span>
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
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Escape y navegación móvil cierran el menú.
  useEffect(() => {
    if (!menuAbierto) return;
    const alTeclear = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setMenuAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [menuAbierto]);

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

        <div className="flex items-center gap-2">
          <Button asChild variant="accent" className="hidden md:inline-flex">
            <Link to="/contacto">Cotizar proyecto</Link>
          </Button>

          {/* Hamburguesa (solo móvil/tablet) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            aria-controls="menu-movil"
            onClick={() => setMenuAbierto((v) => !v)}
          >
            {menuAbierto ? <X className="size-6" /> : <Menu className="size-6" />}
          </Button>
        </div>
      </div>

      {/* Panel móvil desplegable */}
      <nav
        id="menu-movil"
        aria-label="Principal móvil"
        aria-hidden={!menuAbierto}
        className={`md:hidden ${menuAbierto ? "max-h-[26rem] opacity-100" : "max-h-0 opacity-0"} overflow-hidden border-t transition-all duration-200 ease-out`}
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {ENLACES.map((enlace) => (
            <Button
              key={enlace.ruta}
              asChild
              variant="ghost"
              size="sm"
              className="justify-start"
            >
              <Link to={enlace.ruta} onClick={() => setMenuAbierto(false)}>
                {enlace.nombre}
              </Link>
            </Button>
          ))}
          <Button asChild variant="accent" className="mt-2">
            <Link to="/contacto" onClick={() => setMenuAbierto(false)}>
              Cotizar proyecto
            </Link>
          </Button>
        </div>
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
      className="marquesina-contenedor overflow-hidden bg-[var(--brand-acento)] py-1.5"
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
