import { Link } from "react-router-dom";
import { Package, Blocks, MessagesSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECCIONES = [
  {
    icono: Package,
    titulo: "Productos",
    descripcion: "Paquetes de la vitrina: crea, edita, publica y retira.",
    ruta: "/admin/productos",
  },
  {
    icono: Blocks,
    titulo: "Plantillas",
    descripcion: "Soluciones web listas para desplegar.",
    ruta: "/admin/plantillas",
  },
  {
    icono: MessagesSquare,
    titulo: "Servicios",
    descripcion: "Consultoría por sesiones (auditorías, asesorías).",
    ruta: "/admin/servicios",
  },
];

/** Inicio de la administración: accesos a las zonas de gestión. */
export function PaginaAdmin() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">Administración DaJu</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gestiona el contenido de la vitrina desde aquí.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {SECCIONES.map(({ icono: Icono, titulo, descripcion, ruta }) => (
          <Link
            key={ruta}
            to={ruta}
            className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--brand-primario)] text-[var(--brand-acento)]">
              <Icono className="size-5" />
            </div>
            <h2 className="mt-3 flex items-center gap-1 font-bold">
              {titulo}
              <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl bg-muted/60 p-5">
        <h2 className="font-semibold">Panel de diseño</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El modo edición (lapices y dock flotante) vive en la vitrina: entra a
          la página de inicio en modo administrador y pulsa "Edición".
        </p>
        <Button asChild variant="accent" className="mt-3">
          <Link to="/">Ir a la vitrina con edición</Link>
        </Button>
      </div>
    </div>
  );
}
