/**
 * Contratos que el cliente acepta antes de registrarse:
 * - Condiciones del servicio.
 * - Manejo de datos personales (Ley 1581 de Colombia).
 * El registro guarda la versión aceptada (utils/legal.ts en el backend).
 */

interface Seccion {
  titulo: string;
  texto: string;
}

const SECCIONES_CONDICIONES: Seccion[] = [
  {
    titulo: "1. Partes y objeto",
    texto:
      "Este contrato regula la relación entre DaJu Plataform (en adelante “DaJu”) y la persona natural que se registra (en adelante “el Cliente”) para cotizar y contratar paquetes, plantillas y consultoría. Al aceptar, el Cliente declara ser mayor de edad y tener capacidad legal para contratar.",
  },
  {
    titulo: "2. Fase de planeación y diseño — gratis",
    texto:
      "El registro y la fase de planeación y diseño no tienen costo. En esta fase DaJu asesora al Cliente, levanta el alcance, propone vistas y funcionalidades, y presenta una propuesta económica. Esta fase no obliga a pagar ni a continuar con el desarrollo.",
  },
  {
    titulo: "3. Propuesta, etapas y pagos",
    texto:
      "El desarrollo se cobra por etapas que DaJu define y comunica en el entorno del Cliente. Cada etapa se desbloquea cuando su pago queda confirmado. El Cliente elige el medio de pago disponible (transferencias Bre-B, Nequi, DaviPlata, Nu, banco o PayPal) y sube el comprobante cuando aplique. La entrega final se realiza cuando no existan etapas con cobro pendiente, salvo acuerdo expreso.",
  },
  {
    titulo: "4. Plazos y entrega",
    texto:
      "La fecha estimada de entrega se calcula al confirmar el primer pago, sumando días hábiles según el producto contratado. Los atrasos imputables al Cliente (contenidos, aprobaciones, pagos) desplazan la fecha en la misma proporción.",
  },
  {
    titulo: "5. Garantía de soporte",
    texto:
      "Al marcar el proyecto como entregado inicia la garantía de soporte según el producto (2, 6 o 12 meses). Durante la garantía DaJu corrige sin costo los defectos frente a lo acordado. No cubre cambios de alcance, contenidos nuevos ni daños causados por terceros.",
  },
  {
    titulo: "6. Obligaciones del Cliente",
    texto:
      "El Cliente se compromete a entregar oportunamente los contenidos del briefing (textos, logos, imágenes), a revisar y aprobar las etapas, y a usar la plataforma de forma lícita. El Cliente responde por la veracidad de la información que entrega.",
  },
  {
    titulo: "7. Propiedad intelectual",
    texto:
      "Una vez pagadas todas las etapas, el Cliente recibe el uso y explotación del entregable final. DaJu conserva la titularidad de sus componentes reutilizables, plantillas base, metodologías y código de infraestructura propia.",
  },
  {
    titulo: "8. Cancelación y reembolsos",
    texto:
      "El Cliente puede pausar o cancelar el proyecto desde su entorno. Los pagos ya aplicados a etapas trabajadas no son reembolsables; las etapas no iniciadas se evalúan caso a caso. DaJu puede pausar o cancelar proyectos por incumplimiento de pago o uso indebido.",
  },
  {
    titulo: "9. Ley aplicable",
    texto:
      "Este contrato se rige por las leyes de la República de Colombia. Cualquier controversia se resolverá primero de buena fe entre las partes y, de no lograrse, ante la autoridad competente.",
  },
];

const SECCIONES_DATOS: Seccion[] = [
  {
    titulo: "1. Responsable del tratamiento",
    texto:
      "DaJu Plataform es el responsable del tratamiento de los datos personales que el Cliente entrega al registrarse y durante la ejecución del proyecto, conforme a la Ley 1581 de 2012 y sus decretos reglamentarios.",
  },
  {
    titulo: "2. Datos que tratamos",
    texto:
      "Tratamos los datos de identificación y contacto (nombre, apellidos, fecha de nacimiento, correo electrónico), los datos de autenticación (contraseña cifrada), la información del proyecto (briefing, archivos, mensajes) y los datos de pago reportados por el Cliente (comprobantes y referencias de transacción). No almacenamos números de tarjeta ni credenciales bancarias.",
  },
  {
    titulo: "3. Finalidades",
    texto:
      "Usamos los datos para: crear y administrar la cuenta; verificar la mayoría de edad y la identidad; ejecutar el proyecto y comunicarnos contigo; gestionar pagos, comprobantes y facturación; enviar notificaciones del servicio; y cumplir obligaciones legales o requerimientos de autoridades.",
  },
  {
    titulo: "4. Autorización",
    texto:
      "Al aceptar este contrato, el Cliente autoriza de manera previa, expresa e informada el tratamiento de sus datos para las finalidades descritas. Esta autorización puede revocarse por escrito, salvo cuando exista un deber legal de conservar la información.",
  },
  {
    titulo: "5. Encargados y transferencias",
    texto:
      "Para operar usamos proveedores de infraestructura (base de datos, almacenamiento de archivos, correo y pagos) que tratan datos por cuenta de DaJu bajo obligaciones de confidencialidad. No vendemos ni cedemos datos personales a terceros con fines publicitarios.",
  },
  {
    titulo: "6. Seguridad y conservación",
    texto:
      "Aplicamos medidas técnicas y administrativas razonables (cifrado de contraseñas, control de acceso por roles, registro de actividad). Conservamos los datos mientras la relación contractual esté vigente y durante los plazos legales aplicables; luego se eliminan o anonimizan.",
  },
  {
    titulo: "7. Derechos del titular",
    texto:
      "El Cliente puede conocer, actualizar, rectificar y suprimir sus datos, solicitar prueba de la autorización, revocarla y presentar quejas ante la Superintendencia de Industria y Comercio. Las solicitudes se atienden escribiendo al canal de contacto de DaJu en los términos legales.",
  },
  {
    titulo: "8. Menores de edad",
    texto:
      "La plataforma no está dirigida a menores de 18 años. Si detectamos un registro de un menor, la cuenta se suspenderá y los datos se tratarán conforme a la ley.",
  },
];

function Seccion({ titulo, texto }: Seccion) {
  return (
    <section>
      <h2 className="mt-8 text-lg font-bold">{titulo}</h2>
      <p className="mt-2 text-muted-foreground">{texto}</p>
    </section>
  );
}

export function ContratoCondiciones() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-acento)]">
        Contrato 1 de 2
      </p>
      <h1 className="mt-2 text-3xl font-bold">
        Contrato de condiciones del servicio
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Versión 1.0 · Última actualización: {new Date().getFullYear()}
      </p>
      {SECCIONES_CONDICIONES.map((s) => (
        <Seccion key={s.titulo} titulo={s.titulo} texto={s.texto} />
      ))}
    </div>
  );
}

export function ContratoDatos() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-acento)]">
        Contrato 2 de 2
      </p>
      <h1 className="mt-2 text-3xl font-bold">
        Contrato de manejo de datos personales
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Versión 1.0 · Última actualización: {new Date().getFullYear()}
      </p>
      {SECCIONES_DATOS.map((s) => (
        <Seccion key={s.titulo} titulo={s.titulo} texto={s.texto} />
      ))}
    </div>
  );
}
