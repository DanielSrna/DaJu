import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer } from "@/components/layout/footer";
import { Marquesina, Navbar, TopBar } from "@/components/layout/navegacion";
import { BarraPlataforma } from "@/components/layout/barra-plataforma";
import { TemaProvider, useTema } from "@/lib/tema";
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
import { DetallePlantilla } from "@/pages/vitrina/detalle-plantilla";
import { DetalleServicio } from "@/pages/vitrina/detalle-servicio";
import { Comprar } from "@/pages/vitrina/comprar";
import { FAQ } from "@/pages/vitrina/faq";
import { Contacto } from "@/pages/vitrina/contacto";
import { Postventa } from "@/pages/vitrina/postventa";
import { Blog } from "@/pages/vitrina/blog";
import { DetalleBlog } from "@/pages/vitrina/detalle-blog";
import { NoEncontrada, Proximamente } from "@/pages/otros";
import { Login } from "@/pages/portales/login";
import { Recuperar, Restablecer } from "@/pages/portales/recuperar";
import { Verificar } from "@/pages/portales/verificar";
import { Pagos } from "@/pages/portales/pagos";
import { Pagar } from "@/pages/portales/pagar";
import { MuroVerificacion } from "@/components/portal/muro-verificacion";
import { CentroProyectos } from "@/pages/admin/centro-proyectos";
import { AdminPagos } from "@/pages/admin/pagos";
import { AdminMetodosPago } from "@/pages/admin/metodos-pago";
import { Portal } from "@/pages/portales/portal";
import { Notificaciones } from "@/pages/portales/notificaciones";
import { EntornoPaquete } from "@/pages/portales/entorno-paquete";
import { EntornoPaqueteVistas } from "@/pages/portales/entorno-paquete-vistas";
import { EntornoPaqueteFunciones } from "@/pages/portales/entorno-paquete-funciones";
import { EntornoPaqueteChat } from "@/pages/portales/entorno-paquete-chat";
import { PaginaVistaPaquete } from "@/components/portal/vista-paquete";
import { EntornoPlantilla } from "@/pages/portales/entorno-plantilla";
import { EntornoPlantillaVistas, EntornoPlantillaChat } from "@/pages/portales/entorno-plantilla-vistas";
import { EntornoPlantillaFunciones } from "@/pages/portales/entorno-plantilla-funciones";
import { PaginaVistaPlantilla } from "@/components/portal/vista-plantilla";
import { EntornoServicio } from "@/pages/portales/entorno-servicio";
import { EntornoServicioCitas, EntornoServicioChat } from "@/pages/portales/entorno-servicio-citas";
import { Terminos, Privacidad } from "@/pages/legales";
import { ContratoCondiciones, ContratoDatos } from "@/pages/contratos";
import { ListaProductos } from "@/pages/admin/lista-productos";
import { FormularioProducto } from "@/pages/admin/formulario-producto";
import { ListaPlantillas } from "@/pages/admin/lista-plantillas";
import { FormularioPlantilla } from "@/pages/admin/formulario-plantilla";
import { ListaServicios } from "@/pages/admin/lista-servicios";
import { FormularioServicio } from "@/pages/admin/formulario-servicio";
import { OfertasAdmin } from "@/pages/admin/ofertas";
import { BlogAdmin } from "@/pages/admin/blog-admin";

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

/** Reserva el portal a cualquier usuario autenticado (admin o cliente). */
function RequerirSesion({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useModoEdicion();

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="text-muted-foreground">Comprobando sesión…</span>
      </div>
    );
  }
  if (!usuario) return <Login />;
  if (usuario.rol === "cliente" && usuario.emailVerificado === false) {
    return <MuroVerificacion />;
  }
  return <>{children}</>;
}

/**
 * Rutas de la app. Requiere un <Router> arriba (BrowserRouter en producción,
 * MemoryRouter en tests).
 */
export function AppRoutes() {
  const { pathname } = useLocation();
  const { cms } = useTema();

  // SEO por ruta: <title>, description, og:* y canonical
  // (con textos del CMS si el admin los personalizó).
  useEffect(() => {
    aplicarMeta(window.location.href, metaDeRuta(pathname, cms.textos));
  }, [pathname, cms.textos]);

  return (
    <TemaProvider>
      <ModoEdicionProvider>
        <div className="flex min-h-screen flex-col">
          {pathname.startsWith("/cliente") || pathname.startsWith("/admin") ? (
            <BarraPlataforma />
          ) : (
            <>
              <TopBar />
              <Marquesina />
              <Navbar />
            </>
          )}

          <main className="flex-1">
            <Routes>
              {/* Vitrina pública */}
              <Route path="/" element={<Home />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/productos/:slug" element={<DetalleProducto />} />
              <Route path="/productos/:slug/comprar" element={<Comprar tipo="paquete" />} />
              <Route path="/plantillas/:slug" element={<DetallePlantilla />} />
              <Route path="/plantillas/:slug/comprar" element={<Comprar tipo="plantilla" />} />
              <Route path="/servicios/:slug" element={<DetalleServicio />} />
              <Route path="/servicios/:slug/comprar" element={<Comprar tipo="servicio" />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<DetalleBlog />} />
              <Route path="/contacto" element={<Contacto />} />
              <Route path="/postventa" element={<Postventa />} />
              <Route path="/terminos" element={<Terminos />} />
              <Route path="/privacidad" element={<Privacidad />} />
              <Route
                path="/contratos/condiciones"
                element={<ContratoCondiciones />}
              />
              <Route path="/contratos/datos" element={<ContratoDatos />} />

              {/* Portal del cliente (sesión requerida) */}
              <Route path="/cliente/login" element={<Login />} />
              <Route path="/cliente/verificar" element={<Verificar />} />
              <Route path="/cliente/recuperar" element={<Recuperar />} />
              <Route path="/cliente/restablecer" element={<Restablecer />} />
              <Route
                path="/cliente/pagos"
                element={
                  <RequerirSesion>
                    <Pagos />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/pagar/:pagoId"
                element={
                  <RequerirSesion>
                    <Pagar />
                  </RequerirSesion>
                }
              />
              <Route
                path="/admin/pagos"
                element={
                  <RequerirAdmin>
                    <AdminPagos />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/metodos-pago"
                element={
                  <RequerirAdmin>
                    <AdminMetodosPago />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/proyectos"
                element={
                  <RequerirAdmin>
                    <CentroProyectos />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/cliente"
                element={
                  <RequerirSesion>
                    <Portal />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/paquetes/:id"
                element={
                  <RequerirSesion>
                    <EntornoPaquete />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/paquetes/:id/vistas"
                element={
                  <RequerirSesion>
                    <EntornoPaqueteVistas />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/paquetes/:id/vistas/:vistaId"
                element={
                  <RequerirSesion>
                    <PaginaVistaPaquete />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/paquetes/:id/funciones"
                element={
                  <RequerirSesion>
                    <EntornoPaqueteFunciones />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/paquetes/:id/chat"
                element={
                  <RequerirSesion>
                    <EntornoPaqueteChat />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/plantillas/:id"
                element={
                  <RequerirSesion>
                    <EntornoPlantilla />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/plantillas/:id/vistas"
                element={
                  <RequerirSesion>
                    <EntornoPlantillaVistas />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/plantillas/:id/vistas/:vistaId"
                element={
                  <RequerirSesion>
                    <PaginaVistaPlantilla />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/plantillas/:id/funciones"
                element={
                  <RequerirSesion>
                    <EntornoPlantillaFunciones />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/plantillas/:id/chat"
                element={
                  <RequerirSesion>
                    <EntornoPlantillaChat />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/servicios/:id"
                element={
                  <RequerirSesion>
                    <EntornoServicio />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/servicios/:id/citas"
                element={
                  <RequerirSesion>
                    <EntornoServicioCitas />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/servicios/:id/chat"
                element={
                  <RequerirSesion>
                    <EntornoServicioChat />
                  </RequerirSesion>
                }
              />
              <Route
                path="/cliente/notificaciones"
                element={
                  <RequerirSesion>
                    <Notificaciones />
                  </RequerirSesion>
                }
              />
              <Route path="/cliente/*" element={<Proximamente />} />

              {/* Administración (solo admin): los CRUD van bajo /admin/... */}
              <Route path="/admin" element={<Navigate to="/cliente" replace />} />
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
                path="/admin/blog/:id"
                element={
                  <RequerirAdmin>
                    <BlogAdmin />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/blog"
                element={
                  <RequerirAdmin>
                    <BlogAdmin />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/plantillas"
                element={
                  <RequerirAdmin>
                    <ListaPlantillas />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/plantillas/nuevo"
                element={
                  <RequerirAdmin>
                    <FormularioPlantilla />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/plantillas/:slug"
                element={
                  <RequerirAdmin>
                    <FormularioPlantilla />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/servicios"
                element={
                  <RequerirAdmin>
                    <ListaServicios />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/servicios/nuevo"
                element={
                  <RequerirAdmin>
                    <FormularioServicio />
                  </RequerirAdmin>
                }
              />
              <Route
                path="/admin/servicios/:slug"
                element={
                  <RequerirAdmin>
                    <FormularioServicio />
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
