'use strict';

/**
 * Backfill: los subdocumentos de vistas guardados SIN `_id` (semilla cruda o
 * datos previos) generan un id distinto en cada lectura, rompiendo los
 * enlaces de chat/rutas. Asignamos _id estable a cada vista huérfana.
 * Idempotente.
 */
module.exports = {
  async up(db, client) {
    const sesion = client.startSession();
    await sesion.withTransaction(async () => {
      const briefings = await db
        .collection('briefings')
        .find({ 'contenido.vistas.0': { $exists: true } })
        .toArray();

      for (const b of briefings) {
        const vistas = b.contenido?.vistas ?? [];
        const cambios = {};
        vistas.forEach((v, i) => {
          if (!v._id) {
            // ObjectId generado una sola vez y guardado: estable para siempre.
            cambios[`contenido.vistas.${i}._id`] = v._id;
          }
        });
        if (Object.keys(cambios).length > 0) {
          // Necesitamos ids reales: los crea mongoose al pasar por el modelo.
          const { ObjectId } = require('bson');
          for (const [path, valor] of Object.entries(cambios)) {
            cambios[path] = new ObjectId();
          }
          await db
            .collection('briefings')
            .updateOne(
              { _id: b._id },
              {
                $set: cambios,
                $setOnInsert: {},
              },
            );
          console.log(`briefing ${String(b._id)}: ${Object.keys(cambios).length} vistas reparadas`);
        }
      }
    });
    await sesion.endSession();
  },

  async down() {
    // No se revierte: devolver ids a undefined rompería el portal.
  },
};
