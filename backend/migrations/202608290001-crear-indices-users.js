'use strict';

/**
 * Migración inicial: crea índices del modelo User.
 * Los cambios de esquema SIEMPRE se versionan con migrate-mongo.
 */
module.exports = {
  async up(db) {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ rol: 1 });
  },

  async down(db) {
    await db.collection('users').dropIndex('email_1');
    await db.collection('users').dropIndex('rol_1');
  }
};
