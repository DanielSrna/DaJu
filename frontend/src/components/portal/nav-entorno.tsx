import { Link } from "react-router-dom";

export type TabEntorno =
  | "resumen"
  | "vistas"
  | "funciones"
  | "citas"
  | "chat";

interface Props {
  familia: "paquete" | "plantilla" | "servicio";
  id: string;
  activo: TabEntorno;
  esAdmin?: boolean;
}

const POR_FAMILIA: Record<Props["familia"], TabEntorno[]> = {
  paquete: ["resumen", "vistas", "chat"],
  plantilla: ["resumen", "vistas", "funciones", "chat"],
  servicio: ["resumen", "citas", "chat"],
};

const ETIQUETA: Record<TabEntorno, string> = {
  resumen: "Resumen",
  vistas: "Vistas",
  funciones: "Funciones",
  citas: "Citas",
  chat: "Chat",
};

/** Navegación interna de un entorno: cada sección en su propia página. */
export function NavEntorno({ familia, id, activo }: Props) {
  return (
    <nav
      aria-label="Secciones del entorno"
      className="mt-4 flex flex-wrap gap-1.5 rounded-xl border bg-muted/40 p-1.5"
    >
      {POR_FAMILIA[familia].map((tab) => (
        <Link
          key={tab}
          to={`/cliente/${familia === "paquete" ? "paquetes" : familia === "plantilla" ? "plantillas" : "servicios"}/${id}${
            tab === "resumen" ? "" : `/${tab}`
          }`}
          aria-current={tab === activo ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === activo
              ? "bg-[var(--brand-primario)] text-white"
              : "text-[var(--brand-primario)] hover:bg-white"
          }`}
        >
          {ETIQUETA[tab]}
        </Link>
      ))}
    </nav>
  );
}
