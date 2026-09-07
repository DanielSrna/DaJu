'use strict';

/**
 * SEED EXTRA de datos de prueba — "de todo tipo".
 * Añade 3 clientes nuevos (estudio@, inventario@, negocio@), proyectos en
 * estados variados, entornos de plantillas/servicios, citas en todos los
 * estados, solicitudes, mensajes con adjuntos, pagos en failed/refunded,
 * notificaciones y bitácora. Contraseña: Demo123!
 */
const PASS = 'Demo123!';
const { ObjectId } = require('bson');

const IMGS = {
  gray1: 'https://placehold.co/1200x700/e5e7eb/6b7280.png?text=Obra+gris%5CnPortada',
  gray2: 'https://placehold.co/1200x700/e5e7eb/6b7280.png?text=Obra+gris%5CnCalendario',
  ref: 'https://placehold.co/1200x800/0f1b2d/f59e0b.png?text=Referencia+del+cliente',
};

module.exports = {
  async up(db, client) {
    const sesion = client.startSession();
    await sesion.withTransaction(async () => {
      const users = db.collection('users');
      const existentes = await users.find({ email: /@daju\.co$/ }).toArray();
      const porEmail = new Map(existentes.map((u) => [u.email, u._id]));

      const admin = await users.findOne({ rol: 'admin' });
      const ahora = new Date();
      const en = (d) => new Date(ahora.getTime() + d * 86_400_000);

      const crearCliente = async (email, nombre) => {
        if (porEmail.has(email)) return { _id: porEmail.get(email) };
        const r = await users.insertOne({
          email,
          passwordHash: require('bcryptjs').hashSync(PASS, 12),
          nombre,
          rol: 'cliente',
          activo: true,
          createdAt: en(-40),
          updatedAt: en(-40),
        });
        porEmail.set(email, r.insertedId);
        return { _id: r.insertedId };
      };

      const mkPago = async (cliente, full) => {
        const r = await db.collection('pagos').insertOne({
          emailCliente: cliente.email,
          clienteId: cliente._id,
          estado: 'pending',
          referencia: '',
          moneda: 'USD',
          cantidad: 1,
          metadata: {},
          createdAt: en(-30),
          updatedAt: en(-30),
          ...full,
        });
        return { _id: r.insertedId };
      };

      // ============ 1) NEGOCIO: paquete Validor en DISEÑO + pagos variados ============
      const negocio = await crearCliente('negocio@daju.co', 'Cliente Negocio');
      const paqueteValidor = await db.collection('paquetes').findOne({ slug: 'validor' });
      const proyectoVal = await db.collection('proyectos').findOne({ clienteId: negocio._id });
      if (!proyectoVal) {
        const pago = await mkPago(
          { _id: negocio._id, email: 'negocio@daju.co' },
          { tipoProducto: 'paquete', paqueteSlug: 'validor', productoSlug: '', productoId: paqueteValidor._id, descripcion: 'Paquete Validor (seed)', monto: 199, estado: 'paid', referencia: 'seed-ref-negocio-1' },
        );
        const r = await db.collection('proyectos').insertOne({
          clienteId: negocio._id,
          pagoId: pago._id,
          paquete: { slug: 'validor', nombre: 'Paquete Validor', tipo: 'validor', vistasIncluidas: 1, soporteMeses: 2, diasEntrega: 10 },
          estado: 'diseno',
          fechaCompra: en(-12),
          fechaEntrega: en(-2),
          funcionalidades: [],
          createdAt: en(-12),
          updatedAt: en(-2),
        });
        await db.collection('briefings').insertOne({
          proyectoId: r.insertedId,
          clienteId: negocio._id,
          contenido: {
            empresa: 'Taller El Fuerte',
            resumen: {
              nombreProyecto: 'Landing Taller El Fuerte',
              descripcionNegocio: 'Mantenimiento de motos y motores.',
              objetivos: 'Recibir cotizaciones y reservas de turnos.',
              problemaActual: 'Todo por WhatsApp, se pierden pedidos.',
              flujoPrincipal: 'El cliente entra, lee el servicio, pide turno por formulario y recibe confirmación por correo.',
              ejemploFlujo: '1º entra → 2º elige servicio → 3º pide turno → 4º correo de confirmación',
              plazoDeseado: 'Este mes',
              usuarios: { cantidad: 2, tipos: ['Admin', 'Mecánico'], permisos: ['Admin: todo', 'Mecánico: solo agenda'] },
            },
            vistas: [
              { nombre: 'Inicio', requisitos: 'Hero con foto del taller y botón de pedir turno.', semaforo: 'aprobada' },
              { nombre: 'Servicios', requisitos: 'Listado simple con iconos.', semaforo: 'cotizacion' },
            ],
            identidad: {
              fuentes: { tipo: 'lista', valor: 'Modernas y limpias', notas: '' },
              colores: { tipo: 'libre', valor: 'Naranja y grafito', notas: 'Bandeja mecánica' },
              vibra: { tipo: 'dev', valor: '', notas: '' },
            },
          },
          archivos: [],
          completado: true,
          createdAt: en(-11),
          updatedAt: en(-2),
        });
      }

      // Pagos variados para negocio: fallido y reembolsado (historial realista)
      const hayVariados = await db.collection('pagos').countDocuments({ emailCliente: 'negocio@daju.co' });
      if (hayVariados === 1) {
        await mkPago(
          { _id: negocio._id, email: 'negocio@daju.co' },
          { tipoProducto: 'plantilla', paqueteSlug: 'citas', productoSlug: 'citas', productoId: (await db.collection('plantillas').findOne({ slug: 'citas' }))._id, descripcion: 'Plantilla Citas (intento fallido)', monto: 249, estado: 'failed', referencia: 'seed-ref-fail-1' },
        );
        await mkPago(
          { _id: negocio._id, email: 'negocio@daju.co' },
          { tipoProducto: 'servicio', paqueteSlug: 'asesoria-tecnica', productoSlug: 'asesoria-tecnica', cantidad: 1, descripcion: 'Asesoría técnica (reembolsada)', monto: 90, estado: 'refunded', referencia: 'seed-ref-refund-1' },
        );
      }

      // ============ 2) ESTUDIO: plantilla Citas + solicitudes + mensajes ============
      const estudio = await crearCliente('estudio@daju.co', 'Cliente Estudio');
      const plantaCitas = await db.collection('plantillas').findOne({ slug: 'citas' });
      let espCitas = await db.collection("espacios").findOne({ clienteId: estudio._id });
      if (!espCitas) {
        const pago = await mkPago(
          { _id: estudio._id, email: 'estudio@daju.co' },
          { tipoProducto: 'plantilla', paqueteSlug: 'citas', productoSlug: 'citas', productoId: plantaCitas._id, descripcion: 'Plantilla Citas (seed)', monto: 249, estado: 'paid', referencia: 'seed-ref-estudio-1' },
        );
        const r = await db.collection('espacios').insertOne({
          clienteId: estudio._id, tipoProducto: 'plantilla', productoId: plantaCitas._id, productoSlug: 'citas', pagoId: pago._id, estado: 'activo',
          sesiones: { total: 1, usadas: 0 }, createdAt: en(-6), updatedAt: en(-1),
        });
        espCitas = { _id: r.insertedId };

        const v1 = await db.collection('vistadisenos').insertOne({
          espacioId: r.insertedId, nombre: 'Portada', orden: 0, estado: 'cotizacion',
          muestraCliente: { ...IMGS.ref, publicId: 'seed-estudio-ref', nombre: 'referencia.jpg' },
          obraGris: { ...IMGS.gray1, publicId: 'seed-estudio-obra', nombre: 'obra-gris.jpg' },
          archivos: [], createdAt: en(-5), updatedAt: en(-1),
        });
        const v2 = await db.collection('vistadisenos').insertOne({
          espacioId: r.insertedId, nombre: 'Agenda', orden: 1, estado: 'pendiente',
          muestraCliente: null, obraGris: null, archivos: [], createdAt: en(-5), updatedAt: en(-1),
        });

        await db.collection('mensajes').insertMany([
          { contexto: 'vista', contextoId: v1.insertedId, autorTipo: 'cliente', autorId: estudio._id, cuerpo: 'Quiero la portada más limpia, sin textos de relleno.', archivos: [], leidoPor: [estudio._id], createdAt: en(-4), updatedAt: en(-4) },
          { contexto: 'vista', contextoId: v1.insertedId, autorTipo: 'admin', autorId: admin._id, cuerpo: 'Listo: aquí va la obra gris ajustada.', archivos: [{ url: IMGS.gray1, publicId: 'seed-estudio-obra', nombre: 'obra-gris.jpg', mime: 'image/png' }], leidoPor: [], createdAt: en(-3), updatedAt: en(-3) },
          { contexto: 'espacio', contextoId: r.insertedId, autorTipo: 'cliente', autorId: estudio._id, cuerpo: '¿Se pueden poner fotos reales en la agenda?', archivos: [], leidoPor: [estudio._id], createdAt: en(-2), updatedAt: en(-2) },
        ]);

        await db.collection('solicitudfuncions').insertMany([
          { espacioId: r.insertedId, titulo: 'Pago anticipado con depósito', descripcion: 'Quiero que el cliente deje un 20% al reservar.', estado: 'respondida', costo: 60, respuestaAdmin: 'Costo estimado $60 USD.', respondidaPor: admin._id, createdAt: en(-4), updatedAt: en(-1) },
          { espacioId: r.insertedId, titulo: 'Recordatorios por SMS', descripcion: 'Aviso automático un día antes.', estado: 'abierta', costo: 0, respuestaAdmin: '', respondidaPor: null, createdAt: en(-1), updatedAt: en(-1) },
        ]);
      }

      // ============ 3) INVENTARIO: plantilla Inventario + comunicación + pago de función ============
      const inventario = await crearCliente('inventario@daju.co', 'Cliente Inventario');
      const plantaInv = await db.collection('plantillas').findOne({ slug: 'inventario' });
      let espInv = await db.collection('espacios').findOne({ clienteId: inventario._id });
      if (!espInv) {
        const pago = await mkPago(
          { _id: inventario._id, email: 'inventario@daju.co' },
          { tipoProducto: 'plantilla', paqueteSlug: 'inventario', productoSlug: 'inventario', productoId: plantaInv._id, descripcion: 'Plantilla Inventario (seed)', monto: 299, estado: 'paid', referencia: 'seed-ref-inv-1' },
        );
        const r = await db.collection('espacios').insertOne({
          clienteId: inventario._id, tipoProducto: 'plantilla', productoId: plantaInv._id, productoSlug: 'inventario', pagoId: pago._id, estado: 'activo',
          sesiones: { total: 1, usadas: 0 }, createdAt: en(-20), updatedAt: en(-2),
        });
        espInv = { _id: r.insertedId };

        await db.collection('vistadisenos').insertOne({
          espacioId: r.insertedId, nombre: 'Productos', orden: 0, estado: 'aprobada',
          muestraCliente: null, obraGris: { ...IMGS.gray2, publicId: 'seed-inv-obra', nombre: 'obra-gris.jpg' },
          archivos: [], createdAt: en(-18), updatedAt: en(-3),
        });

        // Función pagada (solicitud pagada) + notificaciones y bitácora
        const solPag = await db.collection('solicitudfuncions').insertOne({
          espacioId: r.insertedId, titulo: 'Exportar a Excel', descripcion: 'Reporte mensual descargable.', estado: 'pagada', costo: 45, respuestaAdmin: 'Costo $45 USD.', respondidaPor: admin._id, createdAt: en(-15), updatedAt: en(-10),
        });
        await mkPago(
          { _id: inventario._id, email: 'inventario@daju.co' },
          { tipoProducto: 'funcionalidad', paqueteSlug: 'Exportar a Excel', productoSlug: 'Exportar a Excel', productoId: solPag.insertedId, descripcion: 'Función adicional: Exportar a Excel', monto: 45, estado: 'paid', referencia: 'seed-ref-fn-1', metadata: { solicitudId: solPag.insertedId }, createdAt: en(-10), updatedAt: en(-10) },
        );

        await db.collection('notificaciones').insertMany([
          { tipo: 'plataforma', paraAdmin: true, destinatario: null, titulo: 'Nueva compra confirmada', cuerpo: 'Plantilla Inventario · $299 USD — Cliente Inventario', contexto: 'compra', contextoId: pago._id, creadaPor: null, leidaPor: [], createdAt: en(-20), updatedAt: en(-20) },
          { tipo: 'plataforma', paraAdmin: true, destinatario: null, titulo: 'Función pagada', cuerpo: 'Exportar a Excel · $45 USD', contexto: 'compra', contextoId: solPag.insertedId, creadaPor: null, leidaPor: [], createdAt: en(-10), updatedAt: en(-10) },
          { tipo: 'proyecto', paraAdmin: false, destinatario: inventario._id, titulo: 'Cotización de tu función', cuerpo: 'Exportar a Excel · $45 USD', contexto: 'solicitud', contextoId: solPag.insertedId, creadaPor: admin._id, leidaPor: [], createdAt: en(-11), updatedAt: en(-11) },
        ]);
      }

      // ============ 4) NEGOCIO ya tiene proyecto; añade una solicitud vista + bitácora ============
      const briefNegocio = await db.collection('briefings').findOne({ clienteId: negocio._id });
      if (briefNegocio) {
        const sol = await db.collection('solicitudfuncions').findOne({ proyectoId: briefNegocio.proyectoId });
        if (!sol) {
          await db.collection('solicitudfuncions').insertOne({
            proyectoId: briefNegocio.proyectoId, titulo: 'Servicios', descripcion: 'Función/vista solicitada por el cliente: Servicios', estado: 'respondida', costo: 25, respuestaAdmin: 'Costo $25 USD.', respondidaPor: admin._id, createdAt: en(-2), updatedAt: en(-1),
          });
        }
        const hayBit = await db.collection('bitacoras').countDocuments({ proyectoId: briefNegocio.proyectoId });
        if (hayBit === 0) {
          await db.collection('bitacoras').insertMany([
            { proyectoId: briefNegocio.proyectoId, tipo: 'estado', mensaje: 'Proyecto movido a "diseno"', creadaPor: admin._id, usuarioNombre: 'Admin', createdAt: en(-10), updatedAt: en(-10) },
            { proyectoId: briefNegocio.proyectoId, tipo: 'funcion', mensaje: 'Función/vista nueva: "Servicios"', creadaPor: negocio._id, usuarioNombre: 'Cliente Negocio', createdAt: en(-2), updatedAt: en(-2) },
          ]);
        }
      }

      // ============ 5) DEMO: servicio aceleración con citas en TODOS los estados ============
      const demo = porEmail.get('demo@daju.co');
      if (demo) {
        const espDemo = await db.collection('espacios').findOne({ clienteId: demo });
        if (espDemo) {
          const hayCitas = await db.collection('citas').countDocuments({ espacioId: espDemo._id });
          if (hayCitas === 0) {
            await db.collection('citas').insertMany([
              { espacioId: espDemo._id, sesion: 1, propuestas: [en(-3), en(-2)], confirmada: en(-3), duracionMin: 60, canal: 'Meet', estado: 'confirmada', linkVideollamada: '', notas: 'Primera sesión', confirmadaPor: admin?._id ?? null, createdAt: en(-6), updatedAt: en(-5) },
              { espacioId: espDemo._id, sesion: 2, propuestas: [en(2), en(3)], confirmada: null, duracionMin: 60, canal: 'Meet', estado: 'propuesta', linkVideollamada: '', notas: 'Propuesta del cliente', confirmadaPor: null, createdAt: en(0), updatedAt: en(0) },
            ]);
          }
        }
      }
    });
    await sesion.endSession();
  },

  async down(db, client) {
    const sesion = client.startSession();
    await sesion.withTransaction(async () => {
      const emails = ['negocio@daju.co', 'estudio@daju.co', 'inventario@daju.co'];
      const users = await db.collection('users').find({ email: { $in: emails } }).toArray();
      const ids = users.map((u) => u._id);
      await db.collection('users').deleteMany({ _id: { $in: ids } });
      await db.collection('pagos').deleteMany({ emailCliente: { $in: emails } });
      await db.collection('proyectos').deleteMany({ clienteId: { $in: ids } });
      await db.collection('briefings').deleteMany({ clienteId: { $in: ids } });
      const espacios = await db.collection('espacios').find({ clienteId: { $in: ids } }).toArray();
      const espIds = espacios.map((e) => e._id);
      await db.collection('espacios').deleteMany({ clienteId: { $in: ids } });
      await db.collection('citas').deleteMany({ espacioId: { $in: espIds } });
      await db.collection('solicitudfuncions').deleteMany({ espacioId: { $in: espIds } });
      await db.collection('vistadisenos').deleteMany({ espacioId: { $in: espIds } });
      await db.collection('mensajes').deleteMany({ contextoId: { $in: [...espIds, ...ids] } });
      await db.collection('notificaciones').deleteMany({ destinatario: { $in: ids } });
      await db.collection('bitacoras').deleteMany({ proyectoId: { $in: ids } });
    });
    await sesion.endSession();
  },
};
