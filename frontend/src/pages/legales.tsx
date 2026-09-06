/**
 * Páginas legales de la vitrina: Términos y condiciones y Política de
 * privacidad. Contenido simple y honesto, editable más adelante desde el
 * panel de textos si se requiere.
 */

const SECCIONES_TERMINOS = [
  {
    titulo: "1. Alcance",
    texto:
      "Estos términos rigen el uso de la vitrina y la compra de los servicios de DaJu. Al comprar un paquete aceptas estas condiciones.",
  },
  {
    titulo: "2. Productos y postventa",
    texto:
      "Los paquetes y funciones adicionales se describen con su alcance, tiempo de entrega y soporte. La fecha de entrega se congela al momento de la compra (días hábiles según el paquete) y la garantía inicia al marcar el proyecto como entregado.",
  },
  {
    titulo: "3. Garantía de ajuste",
    texto:
      "Si en los primeros 30 días algo no se comporta como lo pactamos, lo ajustamos sin costo. No devolvemos dinero: probamos, corregimos y hacemos que funcione como lo acordado.",
  },
  {
    titulo: "4. Responsabilidades",
    texto:
      "El cliente es responsable de entregar los contenidos del briefing (textos, logos, imágenes) en los tiempos pactados. DaJu se compromete a entregar un producto probado y documentado.",
  },
];

const SECCIONES_PRIVACIDAD = [
  {
    titulo: "1. Qué datos tratamos",
    texto:
      "Recogemos los datos necesarios para el servicio: nombre, correo, contenido del briefing y datos de contacto. Los datos de pago los procesa la pasarela y no los almacenamos.",
  },
  {
    titulo: "2. Para qué los usamos",
    texto:
      "Para ejecutar tu proyecto, comunicarnos contigo y cumplir obligaciones legales. No vendemos ni compartimos tus datos con terceros fuera de lo necesario para operar.",
  },
  {
    titulo: "3. Cookies",
    texto:
      "Usamos cookies técnicas de sesión (las mínimas para autenticar y recordar tu acceso). No usamos publicidad rastreadora de terceros en esta vitrina.",
  },
  {
    titulo: "4. Tus derechos",
    texto:
      "Puedes solicitar acceso, corrección o eliminación de tus datos escribiéndonos. Respondemos en los plazos que exige la ley aplicable.",
  },
];

function Seccion({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section>
      <h2 className="mt-8 text-lg font-bold">{titulo}</h2>
      <p className="mt-2 text-muted-foreground">{texto}</p>
    </section>
  );
}

export function Terminos() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold">Términos y condiciones</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última actualización: {new Date().getFullYear()}
      </p>
      {SECCIONES_TERMINOS.map((s) => (
        <Seccion key={s.titulo} titulo={s.titulo} texto={s.texto} />
      ))}
    </div>
  );
}

export function Privacidad() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold">Política de privacidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última actualización: {new Date().getFullYear()}
      </p>
      {SECCIONES_PRIVACIDAD.map((s) => (
        <Seccion key={s.titulo} titulo={s.titulo} texto={s.texto} />
      ))}
    </div>
  );
}
