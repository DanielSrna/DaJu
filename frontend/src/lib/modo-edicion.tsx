import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiUrl } from "@/lib/api/cliente";

interface Usuario {
  id: string;
  email: string;
  rol: "admin" | "cliente";
  nombre: string;
  emailVerificado: boolean;
}

/** Contrato de GET /auth/me: la API devuelve { user }. */
interface MeRespuesta {
  user?: Usuario;
}

interface ModoEdicionContexto {
  /** El visitante/propietario está logueado como admin en la vitrina. */
  modoEdicion: boolean;
  cargando: boolean;
  usuario: Usuario | null;
  recargar: () => Promise<void>;
}

const ModoEdicionContext = createContext<ModoEdicionContexto>({
  modoEdicion: false,
  cargando: true,
  usuario: null,
  recargar: async () => {},
});

export function ModoEdicionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = async (): Promise<void> => {
    try {
      const res = await fetch(apiUrl("/auth/me"), {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        setUsuario(null);
        return;
      }
      const datos = (await res.json()) as MeRespuesta;
      setUsuario(datos.user ?? null);
    } catch {
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void recargar();
  }, []);

  return (
    <ModoEdicionContext.Provider
      value={{
        modoEdicion: usuario?.rol === "admin",
        cargando,
        usuario,
        recargar,
      }}
    >
      {children}
    </ModoEdicionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModoEdicion(): ModoEdicionContexto {
  return useContext(ModoEdicionContext);
}
