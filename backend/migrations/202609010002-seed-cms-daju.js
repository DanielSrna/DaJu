'use strict';

/**
 * Identidad visual de DaJu (marca de la agencia).
 * Paleta: azul noche + ámbar (psicología: confianza técnica + CTA cálido).
 * Marquesina inicial apagada. Idempotente: actualiza solo si aún no se personalizó.
 */
module.exports = {
  async up(db) {
    const coleccion = db.collection('cmsconfigs');
    const existente = await coleccion.findOne({});

    if (existente && existente.colores) {
      const esPersonalizado =
        existente.colores.primario !== '#000000' ||
        existente.colores.acento !== '#ffcc00';
      if (esPersonalizado) {
        return; // el admin ya definió su identidad; no la pisamos
      }
    }

    await coleccion.updateOne(
      {},
      {
        $set: {
          colores: {
            primario: '#0F1B2D',
            secundario: '#F8FAFC',
            acento: '#F59E0B',
          },
          marquesina: { texto: '', activo: false },
        },
        $setOnInsert: {
          logo: null,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  },

  async down(db) {
    // No revertimos: la identidad la controla el admin desde el panel.
  },
};
