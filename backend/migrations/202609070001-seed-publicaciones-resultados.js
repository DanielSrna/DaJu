'use strict';

/**
 * Seed del Blog: 2 conceptos que respaldan la sección del inicio
 * "¿Por qué tu negocio necesita una web hoy?" (datos del sector y
 * calculadora de oportunidad). Idempotente por slug.
 */
const publicaciones = [
  {
    slug: 'statista-y-las-cifras-de-la-digitalizacion',
    titulo: 'Statista es confiable: de dónde salen las cifras de la digitalización',
    tipo: 'concepto',
    resumen:
      'Antes de creer en un número, pregúntate de dónde viene. Estas son las fuentes detrás de los datos del sector que usamos.',
    secciones: ['inicio'],
    contenido: [
      '¿De dónde salen los datos?',
      'Las cifras que citamos no salen de la nada. Statista es una plataforma estadística global que compila información de organismos oficiales (UNCTAD, bancos centrales, censos), informes de mercado y empresas de análisis. Sus series de comercio electrónico se actualizan de forma periódica y se citan en prensa y en investigaciones universitarias.',
      '¿Qué muestra Statista?',
      'Ventas globales del comercio electrónico, en miles de millones de dólares: 2019: 3.350 · 2020: 4.280 · 2021: 5.600 · 2022: 6.000 · 2023: 6.320 · 2024: 6.410. Traducido: más de 6 billones de dólares al año en ventas digitales, creciendo cada año sin excepción.',
      'Otras fuentes que respaldan la tendencia',
      'El estudio GE Shopper confirma que 8 de cada 10 compradores investigan en línea antes de comprar. eMarketer proyecta que el comercio electrónico seguirá creciendo cerca del 14% anual. Y organismos como la OCDE muestran que las pymes digitalizadas amplían su alcance de mercado de forma sostenida.',
      '¿Por qué esto te importa?',
      'Si tu negocio no aparece donde tus clientes ya están investigando, la venta la está cerrando otro. Los datos describen el sector: los resultados de cada negocio dependen de su oferta, su estrategia y el seguimiento de cada contacto.',
      '¿Cómo lo hacemos en DaJu?',
      'Basamos nuestros proyectos en estándares de calidad de producto (ISO/IEC 25000) y en datos verificables: nada de promesas vacías, trabajo técnico y acompañamiento honesto.'
    ].join('\n\n'),
    publicado: true
  },
  {
    slug: 'que-son-potenciales-clientes-y-tickets',
    titulo: '¿Qué es un cliente potencial y qué es el ticket promedio?',
    tipo: 'concepto',
    resumen:
      'Los dos números más importantes de tu web, explicados en una calculadora: así entiendes si un sitio puede dar resultado.',
    secciones: ['inicio'],
    contenido: [
      'Clientes potenciales',
      'Son personas que necesitan tu producto o servicio y llegan a tu web con intención de contactarte o comprar. No todo el que visita se convierte: algunos solo miran. Por eso no hablamos de “visitas” sino de personas con intención de adquirir.',
      'Ticket promedio',
      'Es lo que gasta un cliente en una compra o contratación típica. Si ofreces un servicio de 150.000, tu ticket promedio es 150.000. Si tienes combos o varios precios, se calcula dividiendo tus ingresos entre el número de ventas.',
      '¿Por qué una web bien hecha atrae más?',
      'Una web bien hecha responde las preguntas de tu cliente en segundos, muestra precios claros y tiene un botón que lo lleva a contactarte. Cada mes, si tu web convierte una parte de esos visitantes en contactos, los ingresos posibles se calculan así: clientes potenciales × ticket promedio. Eso es exactamente la cuenta que hace la calculadora de nuestro inicio.',
      '¿Y esto qué significa para tu negocio?',
      'No necesitas una web gigante: necesitas que tu página haga bien esa única conversión. Los datos del sector son una referencia; los resultados reales dependen de tu oferta y del esfuerzo en cada contacto.',
      '¿Cómo lo hacemos en DaJu?',
      'Diseñamos tus páginas alrededor de esa conversión: mensaje claro, precios visibles y un camino corto hacia contactarte. Esa es la base de una web que sí vende.'
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
      console.log('Publicaciones resultados sembradas:', creadas.length);
    }
  },

  async down(db) {
    await db.collection('publicaciones').deleteMany({
      slug: { $in: publicaciones.map((p) => p.slug) }
    });
  }
};
