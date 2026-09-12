'use strict';

/**
 * Índices del nuevo flujo de recaudo y etapas:
 * - proyectos/espacios: `pagoId` deja de ser obligatorio; su índice único
 *   pasa a ser SPARSE para permitir varios entornos en planeación (sin pago).
 * - pagos: `codigo` único sparse (código que el cliente escribe en la
 *   transacción) y `metodoPago` para filtrar.
 * - metodopagos: `clave` única (identificador estable del método).
 */
const coleccionesConPago = ['proyectos', 'espacios'];

module.exports = {
  async up(db) {
    for (const coleccion of coleccionesConPago) {
      const indices = await db
        .collection(coleccion)
        .indexes()
        .catch(() => []);
      const existente = indices.find((i) => i.name === 'pagoId_1');
      if (existente && !existente.sparse) {
        await db.collection(coleccion).dropIndex('pagoId_1');
      }
      await db
        .collection(coleccion)
        .createIndex(
          { pagoId: 1 },
          { unique: true, sparse: true, name: 'pagoId_1' }
        );
    }

    await db
      .collection('pagos')
      .createIndex(
        { codigo: 1 },
        { unique: true, sparse: true, name: 'codigo_1' }
      );
    await db
      .collection('pagos')
      .createIndex({ metodoPago: 1 }, { name: 'metodoPago_1' });

    await db
      .collection('metodopagos')
      .createIndex({ clave: 1 }, { unique: true, name: 'clave_1' });
  },

  async down() {
    // Los índices no se revierten: son aditivos y compatibles hacia atrás.
  }
};
