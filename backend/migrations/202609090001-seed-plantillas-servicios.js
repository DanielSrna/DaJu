'use strict';

/**
 * Seed de plantillas y servicios de consultoría.
 * Los precios son PLACEHOLDER: el admin los ajusta desde el panel.
 * Idempotente: no duplica si el slug ya existe.
 */

const plantillas = [
  {
    nombre: 'Plantilla Reservas',
    slug: 'reservas',
    plataforma: 'Reservas',
    descripcion:
      '<p>Sistema de reservas listo para desplegar: calendario, disponibilidad, confirmación automática y recordatorios por correo.</p>',
    precio: 299,
    moneda: 'USD',
    vistasIncluidas: 5,
    soporteMeses: 3,
    diasEntrega: 20,
    features: [
      'Calendario de disponibilidad',
      'Reservas con pago anticipado',
      'Recordatorios automáticos',
      'Panel de administración',
      'Diseño a la marca del cliente',
    ],
    imagen: {
      url: 'https://placehold.co/1600x686/f59e0b/0f1b2d.png?text=Plantilla+Reservas%5CnPortal+de+reservas',
      publicId: 'placehold-reservas-portada',
    },
    galeria: [
      {
        url: 'https://placehold.co/1200x800/0f1b2d/f59e0b.png?text=Vista+1%5CnReservas+listo+para+desplegar',
        publicId: 'placehold-reservas-vista1',
      },
      {
        url: 'https://placehold.co/1200x800/94a3b8/ffffff.png?text=Vista+2%5CnCalendario+y+disponibilidad',
        publicId: 'placehold-reservas-vista2',
      },
    ],
    activo: true,
  },
  {
    nombre: 'Plantilla Inventario',
    slug: 'inventario',
    plataforma: 'Inventario',
    descripcion:
      '<p>Control de inventario listo para desplegar: productos, entradas/salidas, alertas de stock y reportes exportables.</p>',
    precio: 299,
    moneda: 'USD',
    vistasIncluidas: 5,
    soporteMeses: 3,
    diasEntrega: 20,
    features: [
      'Catálogo de productos',
      'Movimientos de entrada/salida',
      'Alertas de stock bajo',
      'Reportes exportables',
      'Panel de administración',
    ],
    imagen: {
      url: 'https://placehold.co/1600x686/0284c7/ffffff.png?text=Plantilla+Inventario%5CnControl+de+stock',
      publicId: 'placehold-inventario-portada',
    },
    galeria: [
      {
        url: 'https://placehold.co/1200x800/0f1b2d/f59e0b.png?text=Vista+1%5CnInventario+listo+para+desplegar',
        publicId: 'placehold-inventario-vista1',
      },
      {
        url: 'https://placehold.co/1200x800/94a3b8/ffffff.png?text=Vista+2%5CnMovimientos+y+alertas',
        publicId: 'placehold-inventario-vista2',
      },
    ],
    activo: true,
  },
  {
    nombre: 'Plantilla Citas',
    slug: 'citas',
    plataforma: 'Citas',
    descripcion:
      '<p>Agenda de citas lista para desplegar: agenda profesional, selección de horario por el cliente y confirmación automática.</p>',
    precio: 249,
    moneda: 'USD',
    vistasIncluidas: 4,
    soporteMeses: 3,
    diasEntrega: 18,
    features: [
      'Agenda profesional',
      'Selección de horario por el cliente',
      'Confirmación automática',
      'Panel de administración',
    ],
    imagen: {
      url: 'https://placehold.co/1600x686/7c3aed/ffffff.png?text=Plantilla+Citas%5CnAgenda+profesional',
      publicId: 'placehold-citas-portada',
    },
    galeria: [
      {
        url: 'https://placehold.co/1200x800/0f1b2d/f59e0b.png?text=Vista+1%5CnCitas+listo+para+desplegar',
        publicId: 'placehold-citas-vista1',
      },
      {
        url: 'https://placehold.co/1200x800/94a3b8/ffffff.png?text=Vista+2%5CnSeleccion+de+horario',
        publicId: 'placehold-citas-vista2',
      },
    ],
    activo: true,
  },
];

const servicios = [
  {
    nombre: 'Auditoría de código',
    slug: 'auditoria-codigo',
    categoria: 'auditoria',
    descripcion:
      '<p>Revisión profunda y sistemática de tu código y tu arquitectura. Salimos con hallazgos documentados, priorizados y un plan de mejora accionable.</p><p>Ideal si sospechas de deuda técnica, seguridad o rendimiento en una aplicación en producción.</p>',
    precio: 120,
    moneda: 'USD',
    duracionMin: 60,
    canal: 'Meet',
    incluye: [
      'Análisis de arquitectura y estructura',
      'Revisión de seguridad (OWASP)',
      'Rendimiento y buenas prácticas',
      'Informe de hallazgos priorizados',
    ],
    activo: true,
  },
  {
    nombre: 'Asesoría técnica 1:1',
    slug: 'asesoria-tecnica',
    categoria: 'asesoria',
    descripcion:
      '<p>Asesoría privada e individual: tráenos tu bloqueo técnico, tu decisión de arquitectura o tu roadmap, y salimos con recomendaciones concretas.</p><p>Para líderes de equipo, CTO y fundadores que necesitan una segunda opinión senior.</p>',
    precio: 90,
    moneda: 'USD',
    duracionMin: 60,
    canal: 'Meet',
    incluye: [
      'Sesión privada con ingeniero senior',
      'Análisis de tu caso en vivo',
      'Recomendaciones escritas al cerrar',
      'Grabación disponible 7 días',
    ],
    activo: true,
  },
  {
    nombre: 'Aceleración de proyecto',
    slug: 'aceleracion-proyecto',
    categoria: 'aceleracion',
    descripcion:
      '<p>Un impulso real para tu equipo: revisamos el estado de tu proyecto, identificamos los bloqueos que frenan el avance y trabajamos una estrategia de salida.</p><p>Perfecto para proyectos que se sienten lentos o que están atascados.</p>',
    precio: 150,
    moneda: 'USD',
    duracionMin: 90,
    canal: 'Zoom',
    incluye: [
      'Diagnóstico del estado real',
      'Bloqueos priorizados (impacto vs esfuerzo)',
      'Plan de acción por semanas',
      'Segunda sesión de seguimiento',
    ],
    activo: true,
  },
];

module.exports = {
  async up(db, client) {
    const sesion = client.startSession();
    await sesion.withTransaction(async () => {
      for (const p of plantillas) {
        const existe = await db
          .collection('plantillas')
          .findOne({ slug: p.slug });
        if (!existe) {
          await db.collection('plantillas').insertOne({
            ...p,
            imagen: p.imagen ?? null,
            galeria: p.galeria ?? [],
            detalles: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
      for (const s of servicios) {
        const existe = await db
          .collection('servicios')
          .findOne({ slug: s.slug });
        if (!existe) {
          await db.collection('servicios').insertOne({
            ...s,
            detalles: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    });
    await sesion.endSession();
  },

  async down(db, client) {
    const sesion = client.startSession();
    await sesion.withTransaction(async () => {
      await db
        .collection('plantillas')
        .deleteMany({ slug: { $in: plantillas.map((p) => p.slug) } });
      await db
        .collection('servicios')
        .deleteMany({ slug: { $in: servicios.map((s) => s.slug) } });
    });
    await sesion.endSession();
  },
};
