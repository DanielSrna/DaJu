'use strict';

/**
 * Backfill de `precioBase` en proyectos y espacios creados antes de existir
 * el campo (seeds y migraciones antiguas). Toma el precio del catálogo:
 * - proyectos: paquete por slug.
 * - espacios: plantilla o servicio por productoId.
 */
module.exports = {
  async up(db) {
    let proyectos = 0;
    const pendientesProyecto = await db
      .collection('proyectos')
      .find({ $or: [{ precioBase: { $exists: false } }, { precioBase: 0 }] })
      .project({ paquete: 1 })
      .toArray();
    for (const proyecto of pendientesProyecto) {
      const slug = proyecto.paquete && proyecto.paquete.slug;
      if (!slug) continue;
      const paquete = await db.collection('paquetes').findOne({ slug });
      if (!paquete) continue;
      await db.collection('proyectos').updateOne(
        { _id: proyecto._id },
        { $set: { precioBase: paquete.precio, moneda: paquete.moneda || 'USD' } }
      );
      proyectos += 1;
    }

    let espacios = 0;
    const pendientesEspacio = await db
      .collection('espacios')
      .find({ $or: [{ precioBase: { $exists: false } }, { precioBase: 0 }] })
      .project({ tipoProducto: 1, productoId: 1 })
      .toArray();
    for (const espacio of pendientesEspacio) {
      const coleccion =
        espacio.tipoProducto === 'servicio' ? 'servicios' : 'plantillas';
      if (!espacio.productoId) continue;
      const producto = await db
        .collection(coleccion)
        .findOne({ _id: espacio.productoId });
      if (!producto) continue;
      await db.collection('espacios').updateOne(
        { _id: espacio._id },
        { $set: { precioBase: producto.precio, moneda: producto.moneda || 'USD' } }
      );
      espacios += 1;
    }

    if (proyectos || espacios) {
      // eslint-disable-next-line no-console
      console.log('Precio base restaurado:', { proyectos, espacios });
    }
  },

  async down() {
    // No se revierte: solo restaura el precio de catálogo que faltaba.
  }
};
