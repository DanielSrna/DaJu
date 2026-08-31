'use strict';

/**
 * Seed de los 3 paquetes base del catálogo.
 * Los precios son PLACEHOLDER iniciales: el admin los ajusta vía PUT /api/v1/paquetes/:id.
 * Idempotente: no duplica si el slug ya existe.
 */
const paquetes = [
  {
    nombre: 'Paquete Validor',
    slug: 'validor',
    tipo: 'validor',
    descripcion:
      'Landing page de 1 vista estática con 2 meses de soporte. Ideal para startups y proyectos rápidos.',
    precio: 199,
    moneda: 'USD',
    vistasIncluidas: 1,
    soporteMeses: 2,
    diasEntrega: 10,
    features: [
      'Landing page (1 vista estática)',
      'Diseño responsive',
      '2 meses de soporte técnico',
    ],
    activo: true,
  },
  {
    nombre: 'Paquete Corporativo',
    slug: 'corporativo',
    tipo: 'corporativo',
    descripcion:
      'Web corporativa de hasta 4 vistas con 6 meses de soporte. Para pequeñas empresas y agencias.',
    precio: 499,
    moneda: 'USD',
    vistasIncluidas: 4,
    soporteMeses: 6,
    diasEntrega: 25,
    features: [
      'Web corporativa (hasta 4 vistas)',
      'Formularios de contacto',
      '6 meses de soporte técnico',
    ],
    activo: true,
  },
  {
    nombre: 'Paquete Operativo',
    slug: 'operativo',
    tipo: 'operativo',
    descripcion:
      'Mini-dashboard CRUD con métricas y 1 año de soporte. Para negocios en digitalización.',
    precio: 999,
    moneda: 'USD',
    vistasIncluidas: 4,
    soporteMeses: 12,
    diasEntrega: 45,
    features: [
      'Mini-dashboard CRUD',
      'Métricas de negocio',
      'Autenticación de usuarios',
      '1 año de soporte técnico',
    ],
    activo: true,
  },
];

module.exports = {
  async up(db) {
    for (const paquete of paquetes) {
      const exists = await db.collection('paquetes').findOne({ slug: paquete.slug });
      if (!exists) {
        await db.collection('paquetes').insertOne({
          ...paquete,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  },

  async down(db) {
    await db.collection('paquetes').deleteMany({
      slug: { $in: paquetes.map((p) => p.slug) },
    });
  },
};
