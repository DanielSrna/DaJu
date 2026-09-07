import { useEffect, useRef } from "react";
import { Bold, Heading2, Heading3, Italic, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Renderiza HTML del editor ya sanitizado (para mostrarlo en la vitrina). */
export function TextoEnriquecido({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizarHtml(html) }}
    />
  );
}

/** Tags permitidas en el HTML enriquecido de descripciones. */
const TAGS_PERMITIDAS = new Set(["H2", "H3", "P", "B", "STRONG", "I", "EM", "SPAN", "BR", "DIV"]);

/**
 * Sanitiza HTML generado por el editor: solo conserva las etiquetas de formato
 * (títulos, negrita, cursiva, tamaño de fuente) y quita scripts/eventos.
 * Cualquier otra etiqueta se "desenvuelve" (conserva el texto).
 */
export function sanitizarHtml(html: string): string {
  if (typeof DOMParser === "undefined") return html.replace(/<[^>]*>/g, "");
  const doc = new DOMParser().parseFromString(html, "text/html");

  const limpiar = (nodo: Element): void => {
    for (const hijo of Array.from(nodo.children)) {
      if (TAGS_PERMITIDAS.has(hijo.tagName.toUpperCase())) {
        // Style: solo se permite font-size
        if (hijo.hasAttribute("style")) {
          const tamaño = (hijo as HTMLElement).style.fontSize;
          if (tamaño) hijo.setAttribute("style", `font-size: ${tamaño}`);
          else hijo.removeAttribute("style");
        }
        for (const attr of Array.from(hijo.attributes)) {
          if (
            attr.name !== "style" &&
            attr.name !== "class" &&
            !attr.name.startsWith("data-")
          ) {
            hijo.removeAttribute(attr.name);
          }
        }
        limpiar(hijo);
      } else {
        // No permitida: se remplaza por su contenido (unwrap).
        const padre = hijo.parentElement;
        if (padre) {
          const fragmento = document.createDocumentFragment();
          while (hijo.firstChild) fragmento.appendChild(hijo.firstChild);
          padre.replaceChild(fragmento, hijo);
        }
      }
    }
  };

  limpiar(doc.body);
  return doc.body.innerHTML;
}

interface EditorTextoProps {
  value?: string;
  html?: string;
  onChange: (html: string) => void;
  ariaLabel?: string;
  textoAcuerdo?: string;
  rows?: number;
}

/**
 * Mini editor WYSIWYG para descripciones (productos, servicios y plantillas):
 * títulos de dos niveles (H2/H3), negrita, cursiva y 3 tamaños de fuente.
 * Genera HTML simple que se sanitiza al leer.
 */
export function EditorTexto({ value, html, onChange, ariaLabel = "Contenido", rows = 6 }: EditorTextoProps) {
  const contenido = html ?? value ?? "";
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      // algunos navegadores no lo soportan, se ignora
    }
  }, []);

  // Sincroniza el contenido cuando el valor externo cambia (carga de datos).
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== contenido && document.activeElement !== el) {
      el.innerHTML = contenido;
    }
  }, [contenido]);

  const ejecutar = (comando: string, valor?: string): void => {
    ref.current?.focus();
    document.execCommand(comando, false, valor);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const alInput = (): void => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div className="rounded-lg border focus-within:ring-2 focus-within:ring-[var(--brand-acento)]">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Negrita"
          title="Negrita"
          className="size-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ejecutar("bold")}
        >
          <Bold className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Cursiva"
          title="Cursiva"
          className="size-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ejecutar("italic")}
        >
          <Italic className="size-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Título nivel 2"
          title="Título (h2)"
          className="gap-1 text-xs font-bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ejecutar("formatBlock", "H2")}
        >
          <Heading2 className="size-4" /> H2
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Título nivel 3"
          title="Subtítulo (h3)"
          className="gap-1 text-xs font-bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ejecutar("formatBlock", "H3")}
        >
          <Heading3 className="size-4" /> H3
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Type className="size-4 text-muted-foreground" aria-hidden="true" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Tamaño pequeño"
          title="Texto pequeño"
          className="size-7 text-xs"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ejecutar("fontSize", "2")}
        >
          S
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Tamaño normal"
          title="Texto normal"
          className="size-7 text-sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ejecutar("fontSize", "3")}
        >
          N
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Tamaño grande"
          title="Texto grande"
          className="size-7 text-base"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ejecutar("fontSize", "5")}
        >
          L
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Selecciona el texto y aplica el formato
        </span>
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        onInput={alInput}
        className="min-h-[9rem] max-h-72 overflow-y-auto px-3 py-2 text-sm outline-none [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_strong]:font-bold [&_em]:italic"
        style={{ minHeight: `${rows * 1.5}rem` }}
      />
    </div>
  );
}
