import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Footer } from "@/components/layout/footer";
import { Marquesina, Navbar, TopBar } from "@/components/layout/navegacion";
import { TemaProvider } from "@/lib/tema";
import { aplicarMeta, metaDeRuta } from "@/lib/meta";
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

            {/* Portales (próximamente) */}
            <Route path="/cliente/login" element={<Proximamente />} />
            <Route path="/cliente/*" element={<Proximamente />} />
            <Route path="/admin/*" element={<Proximamente />} />

            <Route path="*" element={<NoEncontrada />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </TemaProvider>
  );
}
