import { Construction, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/** Página provisional para zonas aún no construidas (cliente/admin). */
export function Proximamente() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <Construction className="size-12 text-[var(--brand-acento)]" />
      <h1 className="mt-4 text-3xl font-bold">Zona en construcción</h1>
      <p className="mt-3 text-muted-foreground">
        El portal de clientes (donde verás tus proyectos, el briefing y la
        garantía) estará disponible muy pronto. Mientras tanto, puedes volver a
        la vitrina.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild variant="accent">
          <Link to="/">
            <LogIn />
            Ir al inicio
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function NoEncontrada() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-7xl font-black text-[var(--brand-acento)]">404</p>
      <h1 className="mt-4 text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-2 text-muted-foreground">
        La página que buscas no existe o fue movida.
      </p>
      <Button asChild variant="accent" className="mt-6">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
