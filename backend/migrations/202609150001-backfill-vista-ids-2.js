'use strict';

/**
 * Backfill 2: la seed extra insertó vistas del briefing sin `_id` (insert crudo).
 * Asigna ids estables a TODO briefing huérfano. Idempotente.
 */
const { ObjectId } = require('bson');

module.exports = {
  async up(db) {
    const briefings = await db
      .collection('briefings')
      .find({ 'contenido.vistas.0': { $exists: true } })
      .toArray();

    for (const b of briefings) {
      const vistas = b.contenido?.vistas ?? [];
      const cambios = {};
      vistas.forEach((v, i) => {
        if (!v._id) cambios[`contenido.vistas.${i}._id`] = new ObjectId();
      });
      if (Object.keys(cambios).length > 0) {
        await db
          .collection('briefings')
          .updateOne({ _id: b._id }, { $set: cambios });
        console.log(`briefing ${String(b._id)}: ${Object.keys(cambios).length} vistas reparadas`);
      }
    }
  },

  async down() {
    // No se revierte.
  },
};
