'use strict';

/**
 * Cliente DEMO TODO-EN-UNO: cliente@daju.co — 1 proyecto de cada tipo.
 * - Paquete Corporativo en desarrollo (briefing con 2 vistas en cotización)
 * - Plantilla Reservas (espacio + 2 vistas, una cotizada $40)
 * - Consultoría Auditoría ×2 sesiones (1 cita confirmada + 1 propuesta)
 * Contraseña: Demo123!
 */
const { ObjectId } = require('bson');

module.exports = {
  async up(db, client) {
    const sesion = client.startSession();
    await sesion.withTransaction(async () => {
      const users = db.collection('users');
      let usuario = await users.findOne({ email: 'cliente@daju.co' });
      if (!usuario) {
        const r = await users.insertOne({
          email: 'cliente@daju.co',
          passwordHash: require('bcryptjs').hashSync('Demo123!', 12),
          nombre: 'Cliente Todo',
          rol: 'cliente',
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        usuario = { _id: r.insertedId };
      }

      const ahora = new Date();
      const en = (d) => new Date(ahora.getTime() + d * 86_400_000);

      // ---- Paquete Corporativo ----
      if (!(await db.collection('proyectos').findOne({ clienteId: usuario._id }))) {
        const paquete = await db.collection('paquetes').findOne({ slug: 'corporativo' });
        const pago = await db.collection('pagos').insertOne({
          tipoProducto: 'paquete', paqueteSlug: 'corporativo', productoSlug: '', productoId: paquete._id,
          cantidad: 1, descripcion: 'Paquete Corporativo', monto: 499, moneda: 'USD',
          emailCliente: 'cliente@daju.co', clienteId: usuario._id, estado: 'paid',
          referencia: 'seed-ref-todo-1', metadata: {}, createdAt: en(-15), updatedAt: en(-15),
        });
        const proy = await db.collection('proyectos').insertOne({
          clienteId: usuario._id, pagoId: pago.insertedId,
          paquete: { slug: 'corporativo', nombre: 'Paquete Corporativo', tipo: 'corporativo', vistasIncluidas: 4, soporteMeses: 6, diasEntrega: 25 },
          estado: 'desarrollo', fechaCompra: en(-15), fechaEntrega: en(10), funcionalidades: [],
          createdAt: en(-15), updatedAt: en(-2),
        });
        const brief = await db.collection('briefings').insertOne({
          proyectoId: proy.insertedId, clienteId: usuario._id,
          contenido: {
            resumen: {
              nombreProyecto: 'Web Consorcio Andina', descripcionNegocio: 'Servicios de ingeniería.',
              objetivos: 'Mostrar proyectos y captar licitaciones.',
              problemaActual: 'Web antigua sin formularios.',
              flujoPrincipal: 'Cliente navega, ve proyectos y deja sus datos.',
              ejemploFlujo: '1º navega → 2º ve portafolio → 3º deja datos → 4º llamamos.',
              plazoDeseado: 'Este mes', noIncluir: 'Tienda online', referenciasLinks: 'https://ejemplo.com/ref',
              identidadActual: 'tengo', idioma: 'Español',
              usuarios: { cantidad: 5, tipos: ['Admin', 'Ingenieros'], permisos: ['Admin: todo', 'Ingenieros: portafolio'] },
            },
            vistas: [
              { _id: new ObjectId(), nombre: 'Inicio', requisitos: 'Hero e imagen de obra.', semaforo: 'aprobada' },
              { _id: new ObjectId(), nombre: 'Portafolio', requisitos: 'Galería filtrable.', semaforo: 'cotizacion' },
              { _id: new ObjectId(), nombre: 'Contacto', requisitos: 'Formulario + mapa.', semaforo: 'pendiente' },
            ],
            identidad: { fuentes: { tipo: 'lista', valor: 'Serif elegante', notas: '' }, colores: { tipo: 'dev', valor: '', notas: '' }, vibra: { tipo: 'libre', valor: 'Serio pero cercano', notas: '' } },
          },
          archivos: [], completado: true, createdAt: en(-14), updatedAt: en(-2),
        });
        await db.collection('solicitudfuncions').insertMany([
          { proyectoId: proy.insertedId, titulo: 'Portafolio', descripcion: 'Función/vista solicitada por el cliente: Portafolio', estado: 'respondida', costo: 40, respuestaAdmin: 'Costo $40 USD.', respondidaPor: null, createdAt: en(-5), updatedAt: en(-2) },
          { proyectoId: proy.insertedId, titulo: 'Contacto', descripcion: 'Función/vista solicitada por el cliente: Contacto', estado: 'abierta', costo: 0, respuestaAdmin: '', respondidaPor: null, createdAt: en(-1), updatedAt: en(-1) },
        ]);
        await db.collection('bitacoras').insertOne({ proyectoId: proy.insertedId, tipo: 'estado', mensaje: 'Proyecto movido a "desarrollo"', creadaPor: null, usuarioNombre: 'Admin', createdAt: en(-3), updatedAt: en(-3) });
        void brief;
      }

      // ---- Plantilla Reservas ----
      let espPl = await db.collection('espacios').findOne({ clienteId: usuario._id, tipoProducto: 'plantilla' });
      if (!espPl) {
        const planta = await db.collection('plantillas').findOne({ slug: 'reservas' });
        const pago = await db.collection('pagos').insertOne({
          tipoProducto: 'plantilla', paqueteSlug: 'reservas', productoSlug: 'reservas', productoId: planta._id,
          cantidad: 1, descripcion: 'Plantilla Reservas', monto: 299, moneda: 'USD',
          emailCliente: 'cliente@daju.co', clienteId: usuario._id, estado: 'paid',
          referencia: 'seed-ref-todo-2', metadata: {}, createdAt: en(-10), updatedAt: en(-10),
        });
        const r = await db.collection('espacios').insertOne({
          clienteId: usuario._id, tipoProducto: 'plantilla', productoId: planta._id, productoSlug: 'reservas', pagoId: pago.insertedId,
          estado: 'activo', sesiones: { total: 1, usadas: 0 }, createdAt: en(-10), updatedAt: en(-1),
        });
        espPl = { _id: r.insertedId };
        const v1 = await db.collection('vistadisenos').insertOne({ espacioId: r.insertedId, nombre: 'Portada', orden: 0, estado: 'cotizacion', muestraCliente: null, obraGris: null, archivos: [], createdAt: en(-5), updatedAt: en(-1) });
        await db.collection('vistadisenos').insertOne({ espacioId: r.insertedId, nombre: 'Calendario', orden: 1, estado: 'pendiente', muestraCliente: null, obraGris: null, archivos: [], createdAt: en(-5), updatedAt: en(-1) });
        await db.collection('solicitudfuncions').insertMany([
          { espacioId: r.insertedId, titulo: 'Portada', descripcion: 'Función/vista solicitada por el cliente: Portada', estado: 'respondida', costo: 40, respuestaAdmin: 'Costo $40 USD.', respondidaPor: null, createdAt: en(-4), updatedAt: en(-2) },
          { espacioId: r.insertedId, titulo: 'Calendario', descripcion: 'Función/vista solicitada por el cliente: Calendario', estado: 'abierta', costo: 0, respuestaAdmin: '', respondidaPor: null, createdAt: en(-4), updatedAt: en(-1) },
        ]);
        const mensaje = await db.collection('mensajes').insertOne({ contexto: 'vista', contextoId: v1.insertedId, autorTipo: 'admin', autorId: null, cuerpo: 'Aquí va la obra gris cuando la tengamos.', archivos: [], leidoPor: [], createdAt: en(-2), updatedAt: en(-2) });
        void mensaje;
      }
      void espPl;

      // ---- Consultoría Auditoría ×2 ----
      let espSer = await db.collection('espacios').findOne({ clienteId: usuario._id, tipoProducto: 'servicio' });
      if (!espSer) {
        const servicio = await db.collection('servicios').findOne({ slug: 'auditoria-codigo' });
        const pago = await db.collection('pagos').insertOne({
          tipoProducto: 'servicio', paqueteSlug: 'auditoria-codigo', productoSlug: 'auditoria-codigo', productoId: servicio._id,
          cantidad: 2, descripcion: 'Auditoría de código × 2 sesiones', monto: 240, moneda: 'USD',
          emailCliente: 'cliente@daju.co', clienteId: usuario._id, estado: 'paid',
          referencia: 'seed-ref-todo-3', metadata: {}, createdAt: en(-8), updatedAt: en(-8),
        });
        const r = await db.collection('espacios').insertOne({
          clienteId: usuario._id, tipoProducto: 'servicio', productoId: servicio._id, productoSlug: 'auditoria-codigo', pagoId: pago.insertedId,
          estado: 'activo', sesiones: { total: 2, usadas: 1 }, createdAt: en(-8), updatedAt: en(-1),
        });
        espSer = { _id: r.insertedId };
        await db.collection('citas').insertMany([
          { espacioId: r.insertedId, sesion: 1, propuestas: [en(-2)], confirmada: en(-2), duracionMin: 60, canal: 'Meet', estado: 'confirmada', linkVideollamada: 'https://meet.google.com/seed-demo', notas: 'Primera sesión', confirmadaPor: null, createdAt: en(-6), updatedAt: en(-5) },
          { espacioId: r.insertedId, sesion: 2, propuestas: [en(2), en(3)], confirmada: null, duracionMin: 60, canal: 'Meet', estado: 'propuesta', linkVideollamada: '', notas: 'Propuesta del cliente', confirmadaPor: null, createdAt: en(0), updatedAt: en(0) },
        ]);
        await db.collection('mensajes').insertOne({ contexto: 'espacio', contextoId: r.insertedId, autorTipo: 'cliente', autorId: usuario._id, cuerpo: 'Quiero revisar el rendimiento de la API.', archivos: [], leidoPor: [usuario._id], createdAt: en(-3), updatedAt: en(-3) });
      }
      void espSer;
    });
    await sesion.endSession();
  },

  async down(db, client) {
    const sesion = client.startSession();
    await sesion.withTransaction(async () => {
      const u = await db.collection('users').findOne({ email: 'cliente@daju.co' });
      if (!u) return;
      const ids = [u._id];
      await db.collection('users').deleteMany({ _id: { $in: ids } });
      await db.collection('pagos').deleteMany({ emailCliente: 'cliente@daju.co' });
      await db.collection('proyectos').deleteMany({ clienteId: { $in: ids } });
      await db.collection('briefings').deleteMany({ clienteId: { $in: ids } });
      const esp = await db.collection('espacios').find({ clienteId: { $in: ids } }).toArray();
      const espIds = esp.map((e) => e._id);
      await db.collection('espacios').deleteMany({ clienteId: { $in: ids } });
      await db.collection('citas').deleteMany({ espacioId: { $in: espIds } });
      await db.collection('solicitudfuncions').deleteMany({ espacioId: { $in: espIds } });
      await db.collection('vistadisenos').deleteMany({ espacioId: { $in: espIds } });
      await db.collection('mensajes').deleteMany({ contextoId: { $in: [...espIds, ...ids] } });
    });
    await sesion.endSession();
  },
};
