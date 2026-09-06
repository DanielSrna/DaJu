'use strict';

/**
 * Seed del catálogo de funcionalidades adicionales (9 de ejemplo).
 * Precio estándar: fácil 20 USD, media 40 USD, difícil 80 USD.
 * Categorías: integraciones | pagina | usuarios | datos.
 * Idempotente por slug interno (se usa el nombre normalizado como clave).
 */
const seed = [
  // Fáciles (20 USD)
  { nombre: 'Formulario de contacto', categoria: 'pagina', complejidad: 'facil', precio: 20 },
  { nombre: 'Galería de imágenes', categoria: 'pagina', complejidad: 'facil', precio: 20 },
  { nombre: 'Enlaces a redes sociales', categoria: 'pagina', complejidad: 'facil', precio: 20 },
  // Medias (40 USD)
  { nombre: 'Blog integrado', categoria: 'pagina', complejidad: 'media', precio: 40 },
  { nombre: 'Chat de WhatsApp', categoria: 'integraciones', complejidad: 'media', precio: 40 },
  { nombre: 'Multilingüe (ES/EN)', categoria: 'pagina', complejidad: 'media', precio: 40 },
  // Difíciles (80 USD)
  { nombre: 'Login de clientes con roles', categoria: 'usuarios', complejidad: 'dificil', precio: 80 },
  { nombre: 'Panel de métricas', categoria: 'datos', complejidad: 'dificil', precio: 80 },
  { nombre: 'Reservas en línea', categoria: 'integraciones', complejidad: 'dificil', precio: 80 },
];

const slugDe = (nombre) =>
  nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

module.exports = {
  async up(db) {
    const actualizados = [];
    for (const item of seed) {
      const clave = slugDe(item.nombre);
      const existente = await db.collection('funcionalidadextras').findOne({ clave });
      if (!existente) {
        await db.collection('funcionalidadextras').insertOne({
          ...item,
          clave,
          descripcion: '',
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        actualizados.push(item.nombre);
      }
    }
    if (actualizados.length) {
      // eslint-disable-next-line no-console
      console.log('Funcionalidades sembradas:', actualizados.join(', '));
    }
  },

  async down(db) {
    await db.collection('funcionalidadextras').deleteMany({
      nombre: { $in: seed.map((s) => s.nombre) },
    });
  },
};
