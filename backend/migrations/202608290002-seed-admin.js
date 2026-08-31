'use strict';

/**
 * Seed del administrador inicial.
 * Usa ADMIN_EMAIL / ADMIN_PASSWORD del entorno (.env).
 * Idempotente: no crea el usuario si ya existe.
 */
const bcrypt = require('bcryptjs');

module.exports = {
  async up(db) {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';

    if (!email || !password) {
      throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD son obligatorias para el seed');
    }

    const exists = await db.collection('users').findOne({ email });
    if (exists) {
      return;
    }

    await db.collection('users').insertOne({
      email,
      passwordHash: bcrypt.hashSync(password, 12),
      nombre: 'Administrador',
      rol: 'admin',
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async down(db) {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    await db.collection('users').deleteOne({ email });
  },
};
