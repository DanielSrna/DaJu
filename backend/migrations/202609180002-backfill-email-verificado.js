'use strict';

/**
 * Backfill de verificación de email: las cuentas creadas antes de existir el
 * campo (`emailVerificado` ausente) quedan verificadas para no bloquear su
 * acceso. Las cuentas con `false` explícito (registros nuevos sin confirmar)
 * se respetan.
 */
module.exports = {
  async up(db) {
    const resultado = await db.collection('users').updateMany(
      { emailVerificado: { $exists: false } },
      { $set: { emailVerificado: true } }
    );
    if (resultado.modifiedCount) {
      // eslint-disable-next-line no-console
      console.log('Usuarios verificados (backfill):', resultado.modifiedCount);
    }
  },

  async down() {
    // No se revierte: marcar como no verificadas volvería a bloquear cuentas.
  }
};
