import { useEffect, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Footer } from "@/components/layout/footer";
import { Marquesina, Navbar, TopBar } from "@/components/layout/navegacion";
import { TemaProvider } from "@/lib/tema";
import { ModoEdicionProvider, useModoEdicion } from "@/lib/modo-edicion";
import { aplicarMeta, metaDeRuta } from "@/lib/meta";
import { DockEditor } from "@/components/editor/dock-editor";

/** Muestra el dock de diseño solo cuando el admin está en la vitrina. */
function DockEditorCondicional() {
  const { modoEdicion } = useModoEdicion();
  return modoEdicion ? <DockEditor /> : null;
}
import { Home } from "@/pages/vitrina/inicio";
import { Productos } from "@/pages/vitrina/productos";
import { DetalleProducto } from "@/pages/vitrina/detalle-producto";
import { Comprar } from "@/pages/vitrina/comprar";
import { FAQ } from "@/pages/vitrina/faq";
import { Contacto } from "@/pages/vitrina/contacto";
import { Postventa } from "@/pages/vitrina/postventa";
import { Blog } from "@/pages/vitrina/blog";
import { DetalleBlog } from "@/pages/vitrina/detalle-blog";
import { NoEncontrada, Proximamente } from "@/pages/otros";
import { Login } from "@/pages/portales/login";
import { Terminos, Privacidad } from "@/pages/legales";
import { ListaProductos } from "@/pages/admin/lista-productos";
import { FormularioProducto } from "@/pages/admin/formulario-producto";
import { PaginaAdmin } from "@/pages/admin/pagina-admin";
import { OfertasAdmin } from "@/pages/admin/ofertas";

/** Restringe una sección a usuarios admin (redirección in silencio si no). */
function RequerirAdmin({ children }: { children: ReactNode }) {
  const { modoEdicion, cargando } = useModoEdicion();

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="text-muted-foreground">Comprobando sesión…</span>
      </div>
    );
  }
  return modoEdicion ? <>{children}</> : <Login />;
}

/**
 * Rutas de la app. Requiere un <Router> arriba (BrowserRouter en producción,
 * MemoryRouter en tests).
 */
export function AppRoutes() {
  const { pathname } = useLocation();

  // SEO por ruta: <title>, description, og:* y canonical.
  useEffect(() => {
    aplicarMeta(window.location.href, metaDeRuta(pathname));
  }, [pathname]);

  return (
    <TemaProvider>
      <ModoEdicionProvider>
        <div className="flex min-h-screen flex-col">
          <TopBar />
          <Marquesina />
          <Navbar />

          <main className="flex-1">
            <Routes>
              {/* Vitrina pública */}
              <Route path="/" element={<Home />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/productos/:slug" element={<DetalleProducto />} />
              <Route path="/productos/:slug/comprar" element={<Comprar />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<DetalleBlog />} />
              <Route path="/contacto" element={<Contacto />} />
              <Route path="/postventa" element={<Postventa />} />
              <Route path="/terminos" element={<Terminos />} />
              <Route path="/privacidad" element={<Privacidad />} />

              {/* Portales (próximamente) */}
              <Route path="/cliente/login" element={<Login />} />
              <Route path="/cliente/*" element={<Proximamente />} />

              {/* Administración (solo admin) */}
              <Route
                path="/admin"
                element={
                  <RequerirAdmin>
                    <PaginaAdmin />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/productos"
                element={
                  <RequerirAdmin>
                    <ListaProductos />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/productos/nuevo"
                element={
                  <RequerirAdmin>
                    <FormularioProducto />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/productos/:slug"
                element={
                  <RequerirAdmin>
                    <FormularioProducto />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/ofertas/:tipo/:id"
                element={
                  <RequerirAdmin>
                    <OfertasAdmin />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/ofertas/:tipo"
                element={
                  <RequerirAdmin>
                    <OfertasAdmin />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/plantillas"
                element={
                  <RequerirAdmin>
                    <OfertasAdmin tipo="plantilla" />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/servicios"
                element={
                  <RequerirAdmin>
                    <OfertasAdmin tipo="consultoria" />
                  </RequerirAdmin>
                }
              />
              <Route path="/admin/*" element={<Proximamente />} />

              <Route path="*" element={<NoEncontrada />} />
            </Routes>
          </main>

          <Footer />
          <DockEditorCondicional />
        </div>
      </ModoEdicionProvider>
    </TemaProvider>
  );
}
