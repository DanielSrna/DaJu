'use strict';

/**
 * Seed de ofertas: 3 plantillas + 3 servicios iniciales (tal como se veían
 * en la vitrina como constantes). Idempotente por tipo + nombre.
 */
const ofertas = [
  {
    tipo: 'plantilla',
    nombre: 'Plantilla Reservas',
    descripcion:
      'Web lista para que tus clientes reserven citas o turnos y tú las administres sin planillas.',
    features: [
      'Calendario de disponibilidad',
      'Confirmaciones por correo',
      'Panel simple para el negocio'
    ],
    desde: 550000,
    activo: true,
    orden: 1
  },
  {
    tipo: 'plantilla',
    nombre: 'Plantilla Inventario',
    descripcion:
      'Solución para llevar tus productos y existencias en línea, lista para desplegar.',
    features: [
      'Registro de productos',
      'Control de existencias',
      'Informes básicos de movimiento'
    ],
    desde: 650000,
    activo: true,
    orden: 2
  },
  {
    tipo: 'plantilla',
    nombre: 'Plantilla Cotizador',
    descripcion:
      'Tus clientes arman su pedido o cotización desde la web y llegan a tu correo listos para responder.',
    features: [
      'Formulario por pasos',
      'Cálculo de precios',
      'Notificación al negocio'
    ],
    desde: 500000,
    activo: true,
    orden: 3
  },
  {
    tipo: 'consultoria',
    nombre: 'Auditoría de código',
    descripcion:
      'Revisión experta de un proyecto existente: calidad, seguridad y deuda técnica con plan de acción.',
    para: 'Para quien ya tiene web o sistema y sospecha que algo no está bien.',
    activo: true,
    orden: 4
  },
  {
    tipo: 'consultoria',
    nombre: 'Aceleración de proyectos',
    descripcion:
      'Nos sumamos a tu equipo por sesiones para destrabar lo que se quedó estancado.',
    para: 'Para startups y equipos con entregas atrasadas o bloqueos técnicos.',
    activo: true,
    orden: 5
  },
  {
    tipo: 'consultoria',
    nombre: 'Asesoría técnica',
    descripcion:
      'Resuelve tus dudas de arquitectura, tecnología o decisión de compra con un ingeniero.',
    para: 'Para quien quiere tomar decisiones informadas antes de invertir.',
    activo: true,
    orden: 6
  }
];

module.exports = {
  async up(db) {
    let creadas = 0;
    for (const oferta of ofertas) {
      const existente = await db.collection('ofertas').findOne({
        tipo: oferta.tipo,
        nombre: oferta.nombre
      });
      if (!existente) {
        await db.collection('ofertas').insertOne({
          ...oferta,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        creadas += 1;
      }
    }
    if (creadas) {
      // eslint-disable-next-line no-console
      console.log('Ofertas sembradas:', creadas);
    }
  },

  async down(db) {
    await db.collection('ofertas').deleteMany({
      $or: ofertas.map((o) => ({ tipo: o.tipo, nombre: o.nombre }))
    });
  }
};
