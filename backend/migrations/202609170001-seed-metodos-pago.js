'use strict';

/**
 * Seed del catálogo de métodos de pago (manuales + PayPal).
 * Los datos de cuentas son placeholders: el admin los edita en el panel.
 * Idempotente por clave.
 */
const metodos = [
  {
    nombre: 'Bre-B',
    clave: 'bre-b',
    tipo: 'manual',
    moneda: 'COP',
    titular: 'DaJu Plataform',
    datos: 'Llave Bre-B: 300 000 0000',
    instrucciones:
      'Transfiere por Bre-B a la llave indicada. Escribe el código {codigo} en el mensaje de la transacción y sube el comprobante.',
    qrUrl: '',
    activo: true,
    orden: 1
  },
  {
    nombre: 'Nequi',
    clave: 'nequi',
    tipo: 'manual',
    moneda: 'COP',
    titular: 'DaJu Plataform',
    datos: 'Celular Nequi: 300 000 0000',
    instrucciones:
      'Envía el pago por Nequi al celular indicado. Escribe el código {codigo} en el mensaje y sube el comprobante.',
    qrUrl: '',
    activo: true,
    orden: 2
  },
  {
    nombre: 'DaviPlata',
    clave: 'daviplata',
    tipo: 'manual',
    moneda: 'COP',
    titular: 'DaJu Plataform',
    datos: 'Celular DaviPlata: 300 000 0000',
    instrucciones:
      'Envía el pago por DaviPlata al celular indicado. Escribe el código {codigo} en el mensaje y sube el comprobante.',
    qrUrl: '',
    activo: true,
    orden: 3
  },
  {
    nombre: 'Nu',
    clave: 'nu',
    tipo: 'manual',
    moneda: 'COP',
    titular: 'DaJu Plataform',
    datos: 'Cuenta Nu: 0000 0000 0000 0000',
    instrucciones:
      'Transfiere a la cuenta Nu indicada. Escribe el código {codigo} en el mensaje y sube el comprobante.',
    qrUrl: '',
    activo: true,
    orden: 4
  },
  {
    nombre: 'Transferencia bancaria',
    clave: 'transferencia-bancaria',
    tipo: 'manual',
    moneda: 'COP',
    titular: 'DaJu Plataform',
    datos: 'Cuenta de ahorros Bancolombia: 000 000000 00',
    instrucciones:
      'Transfiere a la cuenta de ahorros indicada. Escribe el código {codigo} en el mensaje y sube el comprobante.',
    qrUrl: '',
    activo: true,
    orden: 5
  },
  {
    nombre: 'PayPal',
    clave: 'paypal',
    tipo: 'paypal',
    moneda: 'USD',
    titular: 'DaJu Plataform',
    datos: 'Pago en línea con saldo o tarjeta',
    instrucciones:
      'Paga en línea con tu cuenta PayPal. El pago se confirma automáticamente.',
    qrUrl: '',
    activo: true,
    orden: 6
  }
];

module.exports = {
  async up(db) {
    let creados = 0;
    for (const metodo of metodos) {
      const existente = await db
        .collection('metodopagos')
        .findOne({ clave: metodo.clave });
      if (!existente) {
        await db.collection('metodopagos').insertOne({
          ...metodo,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        creados += 1;
      }
    }
    if (creados) {
      // eslint-disable-next-line no-console
      console.log('Métodos de pago sembrados:', creados);
    }
  },

  async down(db) {
    await db
      .collection('metodopagos')
      .deleteMany({ clave: { $in: metodos.map((m) => m.clave) } });
  }
};
