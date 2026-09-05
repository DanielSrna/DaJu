'use strict';

/**
 * Seed del Blog para la vitrina (Inicio):
 * 3 conceptos nuevos que respaldan la sección "¿Por qué elegir DaJu?"
 * y activación de la entrada de garantía en la sección "inicio".
 * Idempotente por slug / $addToSet.
 */
const publicaciones = [
  {
    slug: 'codigo-a-la-medida-o-plantillas',
    titulo: '¿Código a la medida o plantilla? Qué le conviene a tu negocio',
    tipo: 'concepto',
    resumen:
      'Las plantillas son rápidas y baratas, pero tienen un techo. Esto cambia cuando el código se construye para tu negocio.',
    secciones: ['inicio', 'productos'],
    contenido: [
      '¿Cuál es la diferencia?',
      'Una plantilla es un diseño genérico que se rellena con tus textos. El código a la medida se escribe desde cero para tu negocio: tu estructura, tus secciones y tus funciones, sin piezas que no uses.',
      '¿Por qué importa?',
      'La plantilla parece más barata hasta que necesitas algo distinto: cambiar una sección, sumar una función o ajustar el diseño a tu marca. Ahí empiezan los parches y los costos ocultos. Con código propio, cada cambio futuro se hace sobre una base que conocemos al detalle, con pruebas y sin sorpresas.',
      '¿Cómo lo hacemos en DaJu?',
      'Cada proyecto lo construimos a la medida con estándares profesionales: código versionado, pruebas y revisión antes de publicar. El resultado no es una página bonita: es una base sólida que puedes hacer crecer.'
    ].join('\n\n'),
    publicado: true
  },
  {
    slug: 'proceso-de-un-proyecto-web',
    titulo: 'Cómo avanza tu proyecto: etapas y fecha de entrega',
    tipo: 'concepto',
    resumen:
      'Recibido, diseño, desarrollo y entrega: así se ve tu proyecto por dentro y así sabes cuándo estará listo.',
    secciones: ['inicio', 'faq', 'postventa'],
    contenido: [
      '¿Cómo se ve el proceso?',
      'Después de tu compra el proyecto pasa por cuatro estados que puedes seguir: recibido (nos llega tu briefing), diseño (estructura y estilo), desarrollo (construcción y pruebas) y entregado (publicación y garantía).',
      '¿Por qué importa?',
      'El misterio mata la confianza. Cuando sabes en qué etapa está tu proyecto y cuándo se entrega, puedes planear tu lanzamiento sin adivinar. Por eso fijamos la fecha el día de la compra: días hábiles según el paquete, congelados para que no se mueva.',
      '¿Cómo lo hacemos en DaJu?',
      'En tu portal ves el estado de tu proyecto y la fecha estimada en todo momento. Si algo requiere más tiempo, te avisamos con anticipación y con razones claras: la comunicación también es parte del servicio.'
    ].join('\n\n'),
    publicado: true
  },
  {
    slug: 'funcionalidades-extra-para-tu-web',
    titulo: 'Funcionalidades extra: qué más puedes sumarle a tu web',
    tipo: 'concepto',
    resumen:
      'Pagos en línea, reservas, inventario, cotizadores... funciones con precio según complejidad, sin letra pequeña.',
    secciones: ['inicio', 'productos'],
    contenido: [
      '¿Qué es una funcionalidad extra?',
      'Es una capacidad que se suma a tu paquete base: recibir pagos con tarjeta o PSE, un formulario de reservas, un inventario simple, un cotizador... Cada una tiene un costo según su complejidad, no según lo que creamos que puedes pagar.',
      '¿Por qué importa?',
      'Ningún negocio es igual a otro, y las funciones que necesitas hoy pueden no ser las mismas del próximo año. Comprar un sistema gigante que no usas es desperdiciar plata; pagar solo por lo que usas es crecer sin fricción.',
      '¿Cómo lo hacemos en DaJu?',
      'En el paso de personalización de cualquier paquete ves el catálogo de funcionalidades con su precio. Y si necesitas algo que no está listado, lo cotizamos por separado: tu web crece a tu ritmo.'
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

    // La entrada de garantía también respalda la sección "inicio".
    await db.collection('publicaciones').updateOne(
      { slug: 'garantia-y-soporte-postventa' },
      { $addToSet: { secciones: 'inicio' } }
    );

    if (creadas.length) {
      // eslint-disable-next-line no-console
      console.log('Publicaciones vitrina sembradas:', creadas.length);
    }
  },

  async down(db) {
    await db.collection('publicaciones').deleteMany({
      slug: { $in: publicaciones.map((p) => p.slug) }
    });
    await db.collection('publicaciones').updateOne(
      { slug: 'garantia-y-soporte-postventa' },
      { $pull: { secciones: 'inicio' } }
    );
  }
};
