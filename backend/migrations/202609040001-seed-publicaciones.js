'use strict';

/**
 * Seed del Blog: 6 conceptos + 2 noticias iniciales.
 * Sin autores ni fechas públicas. Recomendación sutil de DaJu dentro del texto.
 * Idempotente por slug.
 */
const publicaciones = [
  {
    slug: 'que-es-una-landing-page',
    titulo: '¿Qué es una landing page y por qué la necesitas?',
    tipo: 'concepto',
    resumen:
      'La página que concentra a un visitante en una sola acción: la base de todo negocio que empieza.',
    secciones: ['inicio', 'productos'],
    contenido: [
      '¿Qué es?',
      'Una landing page (o página de aterrizaje) es una página web enfocada en UNA sola acción: pedir el presupuesto, suscribirse a un correo o comprar. Nada de menús interminables ni distracciones: un mensaje claro y un botón.',
      '¿Por qué importa?',
      'Cuando recién empiezas, tu primera web no necesita ser gigante: necesita CONVERTIR. Un visitante que entiende qué ofreces en 10 segundos y tiene un botón claro es un visitante que puede volverse cliente. Eso es precisamente lo que hace una landing bien hecha.',
      '¿Cómo lo hacemos en DaJu?',
      'Diseñamos la página alrededor de tu oferta real: el mensaje, los beneficios y una llamada a la acción imposible de ignorar. Por eso nuestro paquete Validador incluye exactamente esto: una vista estática enfocada en vender, con 2 meses de soporte para ajustar lo que haga falta.'
    ].join('\n\n'),
    publicado: true
  },
  {
    slug: 'dominio-y-hosting',
    titulo: 'Dominio y hosting: qué son y cuánto cuestan',
    tipo: 'concepto',
    resumen:
      'Dos conceptos que confunden a todo el que empieza. Aquí la explicación simple y los costos reales.',
    secciones: ['inicio', 'productos'],
    contenido: [
      '¿Qué es?',
      'El dominio es la dirección de tu web (tunegocio.com) y el hosting es el espacio donde vive tu web en internet, como un local arrendado. Sin dominio no te encuentran; sin hosting no hay nada que mostrar.',
      '¿Por qué importa?',
      'Muchos negocios se estancan porque creen que la web es un gasto enorme. La realidad: un dominio cuesta entre 10 y 20 dólares al año y el hosting de una web profesional ronda entre 5 y 15 dólares al mes. Con eso en claro, la decisión de tener presencia digital se vuelve obvia.',
      '¿Cómo lo hacemos en DaJu?',
      'Te acompañamos a elegir dominio y hosting adecuados para tu tamaño, y si no quieres preocuparte por la parte técnica, nosotros nos encargamos de la configuración. Pregúntanos en el formulario de contacto por el servicio de puesta en marcha.'
    ].join('\n\n'),
    publicado: true
  },
  {
    slug: 'web-o-tienda-en-linea',
    titulo: '¿Web corporativa o tienda en línea? Cómo decidir',
    tipo: 'concepto',
    resumen:
      'No todo negocio necesita vender por internet. La guía para elegir el tipo de web correcto.',
    secciones: ['productos'],
    contenido: [
      '¿Qué es?',
      'Una web corporativa presenta tu empresa: servicios, contacto y credibilidad. Una tienda en línea (e-commerce) te permite vender productos con carrito y pagos. Son herramientas distintas para objetivos distintos.',
      '¿Por qué importa?',
      'Elegir mal significa pagar de más o quedarte corto. Si vendes servicios (consultorías, trabajos, asesorías), una web corporativa bien hecha es suficiente y más rentable. Si vendes productos físicos o digitales repetibles, ahí sí necesitas comercio electrónico.',
      '¿Cómo lo hacemos en DaJu?',
      'En el paquete Corporativo construimos tu presencia de hasta 4 vistas; y si el día de mañana quieres vender en línea, podemos sumarte funcionalidades de comercio con costo según complejidad. Crecemos contigo, no te vendemos lo que no necesitas.'
    ].join('\n\n'),
    publicado: true
  },
  {
    slug: 'pagos-digitales-colombia',
    titulo: '¿Qué son PSE, NEQUI y las tarjetas en tu web?',
    tipo: 'concepto',
    resumen:
      'En Colombia la gente no paga solo con tarjeta: entender los métodos locales te hace vender más.',
    secciones: ['productos'],
    contenido: [
      '¿Qué es?',
      'Son métodos de pago digitales: PSE (débito desde el banco), NEQUI y Daviplata (billeteras móviles), además de tarjetas de crédito y débito. Una pasarela de pagos los agrupa en un solo punto de cobro.',
      '¿Por qué importa?',
      'Si tu web solo acepta tarjeta, estás dejando afuera a una gran parte de tus clientes potenciales. Quien paga con NEQUI o PSE tiene intención de compra; si no encuentra su método, abandona el carrito. Pagar como el cliente quiere no es un lujo: es conversión.',
      '¿Cómo lo hacemos en DaJu?',
      'Integramos pasarelas que aceptan tarjeta, PSE y billeteras móviles en tus productos. Así, cuando un cliente tuyo quiera pagar con su método favorito, tu web estará lista para recibirlo.'
    ].join('\n\n'),
    publicado: true
  },
  {
    slug: 'que-es-un-mini-dashboard',
    titulo: '¿Qué es un mini-dashboard (CRM) y para qué sirve?',
    tipo: 'concepto',
    resumen:
      'Métricas simples que te dicen si tu negocio avanza, sin hojas de cálculo interminables.',
    secciones: ['inicio', 'productos'],
    contenido: [
      '¿Qué es?',
      'Un mini-dashboard es un panel con los datos clave de tu operación: ventas, clientes, inventario o reservas, organizados en tablas y métricas fáciles de leer. Piensa en él como el tablero del carro de tu negocio.',
      '¿Por qué importa?',
      'No puedes mejorar lo que no mides. Cuando tu negocio crece, dejar de depender de la memoria o del cuaderno es lo que separa a los que escalan de los que se ahogan. Un panel simple te dice cada semana cómo vas, sin necesidad de un contador a tiempo completo.',
      '¿Cómo lo hacemos en DaJu?',
      'El paquete Operativo construye ese mini-dashboard a tu medida: con tus métricas, tus clientes y tu lógica. No compras un software genérico: compras un panel hecho para tu negocio, con un año de soporte.'
    ].join('\n\n'),
    publicado: true
  },
  {
    slug: 'garantia-y-soporte-postventa',
    titulo: '¿Qué es la garantía y el soporte post-venta en una web?',
    tipo: 'concepto',
    resumen:
      'La web no termina el día de la entrega: lo que pasa después define si tu inversión rinde.',
    secciones: ['postventa', 'faq'],
    contenido: [
      '¿Qué es?',
      'La garantía es la ventana de tiempo (2, 6 o 12 meses) en la que corregimos sin costo lo que no funcione como se acordó. El soporte post-venta es el acompañamiento: resolver dudas, ajustar textos o explicarte cómo administrar tu web.',
      '¿Por qué importa?',
      'Contratar una web sin soporte es como comprar un carro sin garantía: si algo falla al mes, pagas de nuevo. Los proyectos digitales siempre tienen detalles que pulir en las primeras semanas, y tener a quien llamar marca la diferencia entre una inversión que rinde y un dolor de cabeza.',
      '¿Cómo lo hacemos en DaJu?',
      'Todos nuestros paquetes incluyen soporte con garantía y te avisamos cuando inicia y cuando expira. ¿Quieres entender mejor cómo funciona después de la compra? Visita nuestra sección de Servicios post-venta.'
    ].join('\n\n'),
    publicado: true
  },
  {
    slug: 'pagos-con-mercadopago',
    titulo: 'Ahora aceptamos pagos con MercadoPago, PSE y NEQUI',
    tipo: 'noticia',
    resumen:
      'Tu futuro cliente podrá pagar con el método que usa todos los días. Así se integra a tus productos.',
    secciones: ['productos'],
    contenido: [
      'A partir de ahora, los paquetes de DaJu pueden incluir cobros con MercadoPago, que permite a tus clientes pagar con tarjeta, PSE o billeteras móviles como NEQUI y Daviplata.',
      '¿Qué significa para ti?',
      'Si vendes servicios o productos, tus clientes pagarán como les resulte más cómodo, sin fricciones. Y tú recibes el dinero de forma organizada, con el historial claro de cada transacción.',
      '¿Cómo pedirlo?',
      'Elige cualquier paquete y suma la funcionalidad de pagos en el paso de personalización, o escríbenos por el formulario de contacto para una cotización a tu medida.'
    ].join('\n\n'),
    publicado: true
  },
  {
    slug: 'bienvenidos-al-blog',
    titulo: 'Bienvenidos a nuestro blog: conceptos para crecer',
    tipo: 'noticia',
    resumen:
      'Estrenamos esta sección para explicar, sin tecnicismos, lo que todo negocio debería saber de su web.',
    secciones: ['inicio'],
    contenido: [
      'Hoy lanzamos el blog de DaJu: un espacio donde explicamos los conceptos que rodean a las webs, los pagos digitales y el crecimiento de negocios que están empezando.',
      '¿Por qué lo hacemos?',
      'Porque creemos que un cliente que entiende lo que compra toma mejores decisiones y aprovecha más su inversión. Aquí encontrarás explicaciones simples, sin humo técnico, pensadas para quien está arrancando.',
      'Te invitamos a explorar nuestros primeros conceptos y a escribirnos si hay algún tema que quieras que expliquemos.'
    ].join('\n\n'),
    publicado: true
  }
];

module.exports = {
  async up(db) {
    const creadas = [];
    for (const pub of publicaciones) {
      const existente = await db.collection('publicaciones').findOne({ slug: pub.slug });
      if (!existente) {
        await db.collection('publicaciones').insertOne({
          ...pub,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        creadas.push(pub.slug);
      }
    }
    if (creadas.length) {
      // eslint-disable-next-line no-console
      console.log('Publicaciones sembradas:', creadas.length);
    }
  },

  async down(db) {
    await db.collection('publicaciones').deleteMany({
      slug: { $in: publicaciones.map((p) => p.slug) }
    });
  }
};
