import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api/cliente";
import type { CmsPublico } from "@/lib/api/tipos";

/** Paleta por defecto (DaJu): azul noche + ámbar. Se pisa con la del CMS. */
const PALETA_DEFAULT: CmsPublico = {
  logo: null,
  colores: { primario: "#0F1B2D", secundario: "#F8FAFC", acento: "#F59E0B" },
  marquesina: { texto: "", activo: false },
  carrusel: [],
  textos: {},
  descuento: { activo: false, porcentaje: 20, mensaje: "", hasta: null },
  diasExtra: 0,
};

interface TemaContexto {
  cms: CmsPublico;
  cargando: boolean;
  recargar: () => Promise<void>;
}

const TemaContext = createContext<TemaContexto>({
  cms: PALETA_DEFAULT,
  cargando: true,
  recargar: async () => {},
});

function aplicarColores(cms: CmsPublico): void {
  const raiz = document.documentElement;
  raiz.style.setProperty("--brand-primario", cms.colores.primario);
  raiz.style.setProperty("--brand-secundario", cms.colores.secundario);
  raiz.style.setProperty("--brand-acento", cms.colores.acento);
  // El "primary" (botones principales) usa el acento de marca para CTAs cálidos.
  raiz.style.setProperty("--primary", cms.colores.acento);
  raiz.style.setProperty("--primary-foreground", "#0F1B2D");
  raiz.style.setProperty("--accent", cms.colores.acento);
  raiz.style.setProperty("--accent-foreground", "#0F1B2D");
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [cms, setCms] = useState<CmsPublico>(PALETA_DEFAULT);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const datos = await api.cms();
      setCms(datos);
      aplicarColores(datos);
    } catch {
      // Sin API: se queda la paleta DaJu por defecto (la vitrina sigue en pie).
      aplicarColores(PALETA_DEFAULT);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return (
    <TemaContext.Provider value={{ cms, cargando, recargar }}>
      {children}
    </TemaContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTema(): TemaContexto {
  return useContext(TemaContext);
}
