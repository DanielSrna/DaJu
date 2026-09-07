'use strict';

/**
 * Seed de textos SEO por página (panel de diseño → "SEO por página").
 * Claves: meta.<pagina>.titulo / meta.<pagina>.descripcion.
 * Idempotente: solo escribe la clave si aún no existe (no pisa ajustes del admin).
 */

const textosSeo = {
  'meta.inicio.titulo': 'DaJu — Agencia web | Webs que venden',
  'meta.inicio.descripcion':
    'Landings, webs corporativas y mini-dashboards a la medida, con soporte con garantía. Cuéntanos tu idea y recibe tu web lista en semanas.',
  'meta.productos.titulo': 'Paquetes, plantillas y consultoría — DaJu',
  'meta.productos.descripcion':
    'Paquetes de alcance cerrado, plantillas listas para desplegar y consultoría por sesiones. Precios claros, soporte con garantía y entrega fija.',
  'meta.blog.titulo': 'Blog — DaJu | Conceptos sin tecnicismos',
  'meta.blog.descripcion':
    'Conceptos y noticias para negocios que quieren crecer: aprende qué web necesitas y qué se hace en cada etapa.',
  'meta.faq.titulo': 'Preguntas frecuentes — DaJu',
  'meta.faq.descripcion':
    'Resolvemos tus dudas sobre precios, tiempos de entrega, garantía y soporte antes de que empieces tu proyecto.',
  'meta.contacto.titulo': 'Contacto — DaJu | Cuéntanos tu idea',
  'meta.contacto.descripcion':
    'Conversemos: te ayudamos a convertir tu idea en una web lista para crecer, sin presión y con precios claros.',
  'meta.postventa.titulo': 'Postventa — DaJu | Briefing y garantía',
  'meta.postventa.descripcion':
    'El viaje después de comprar: briefing guiado, seguimiento por etapas, fecha de entrega fija y soporte con garantía.',
};

module.exports = {
  async up(db) {
    const config = await db.collection('cmsconfigs').findOne({});
    if (!config) return;

    const textosActuales = config.textos ?? {};
    const nuevos = {};
    for (const [clave, valor] of Object.entries(textosSeo)) {
      if (!textosActuales[clave]) nuevos[clave] = valor;
    }
    if (Object.keys(nuevos).length > 0) {
      // Las claves llevan puntos (meta.pagina.titulo): NO usar paths puntuales,
      // se reescribe el objeto completo para guardarlas planas.
      await db
        .collection('cmsconfigs')
        .updateOne(
          { _id: config._id },
          { $set: { textos: { ...textosActuales, ...nuevos } } },
        );
    }
  },
};
