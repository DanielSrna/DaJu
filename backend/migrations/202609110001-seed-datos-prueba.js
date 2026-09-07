'use strict';

/**
 * SEED DE DATOS DE PRUEBA — ejercicio completo de la plataforma.
 * Crea 3 clientes demonio con cada tipo de compra y datos ricos:
 *   demo@daju.co     → consultoría (espacio + citas + chat)          // Demo123!
 *   paquete@daju.co  → paquete corporativo (proyecto + briefing v2) // Demo123!
 *   plantilla@daju.co→ plantilla Reservas (espacio + vistas + obra gris)
 *                                                                    // Demo123!
 * Idempotente: no duplica si el email ya existe.
 */

const PASS = 'Demo123!';

const IMGS = {
  obraGris1: 'https://placehold.co/1200x700/e5e7eb/6b7280.png?text=Obra+gris%5CnPortada',
  obraGris2: 'https://placehold.co/1200x700/e5e7eb/6b7280.png?text=Obra+gris%5CnCalendario',
  vitrina1: 'https://placehold.co/1200x800/0f1b2d/f59e0b.png?text=Vista+1%5CnReservas+listo',
  vitrina2: 'https://placehold.co/1200x800/94a3b8/ffffff.png?text=Vista+2%5CnCalendario',
};

async function hash(pass) {
  const bcrypt = require('bcryptjs');
  return bcrypt.hashSync(pass, 12);
}

module.exports = {
  async up(db, client) {
    const sesion = client.startSession();
    await sesion.withTransaction(async () => {
      const usuariosDb = db.collection('users');
      const pagosDb = db.collection('pagos');
      const proyectosDb = db.collection('proyectos');
      const briefingsDb = db.collection('briefings');
      const espaciosDb = db.collection('espacios');
      const citasDb = db.collection('citas');
      const mensajesDb = db.collection('mensajes');
      const vistasDb = db.collection('vistadisenos');
      const solicitudesDb = db.collection('solicitudfuncions');
      const paquetesDb = db.collection('paquetes');
      const plantillasDb = db.collection('plantillas');
      const serviciosDb = db.collection('servicios');
      const usuariosExist = await usuariosDb.find({ email: /@daju\.co$/ }).toArray();

      const ahora = new Date();
      const en = (dias) => new Date(ahora.getTime() + dias * 86_400_000);

      // ---------------- 1) CLIENTE CONSULTORÍA (demo@daju.co) ----------------
      let demo = usuariosExist.find((u) => u.email === 'demo@daju.co');
      if (!demo) {
        const res = await usuariosDb.insertOne({
          email: 'demo@daju.co',
          passwordHash: await hash(PASS),
          nombre: 'Cliente Demo',
          rol: 'cliente',
          activo: true,
          createdAt: ahora,
          updatedAt: ahora,
        });
        demo = { _id: res.insertedId };
      }

      const servicioAudi = await serviciosDb.findOne({ slug: 'auditoria-codigo' });
      let pagoDemo = await pagosDb.findOne({ emailCliente: 'demo@daju.co', estado: 'paid' });
      let espDemo;
      if (!pagoDemo) {
        pagoDemo = await pagosDb.insertOne({
          tipoProducto: 'servicio',
          paqueteSlug: servicioAudi.slug,
          productoSlug: servicioAudi.slug,
          productoId: servicioAudi._id,
          cantidad: 3,
          descripcion: 'Auditoría de código × 3 sesiones',
          monto: 360,
          moneda: 'USD',
          emailCliente: 'demo@daju.co',
          clienteId: demo._id,
          estado: 'paid',
          referencia: 'seed-ref-consulta-1',
          metadata: {},
          createdAt: ahora,
          updatedAt: ahora,
        });
        pagoDemo = { _id: pagoDemo.insertedId };
      }
      espDemo =
        (await espaciosDb.findOne({ clienteId: demo._id })) ??
        (await (async () => {
          const r = await espaciosDb.insertOne({
            clienteId: demo._id,
            tipoProducto: 'servicio',
            productoId: servicioAudi._id,
            productoSlug: servicioAudi.slug,
            pagoId: pagoDemo._id,
            estado: 'activo',
            sesiones: { total: 3, usadas: 1 },
            createdAt: ahora,
            updatedAt: ahora,
          });
          return { _id: r.insertedId };
        })());

      // Citas: una confirmada (pasada) + una propuesta para el futuro
      const citasDemo = citasDb.countDocuments({ espacioId: espDemo._id });
      if ((await citasDemo) === 0) {
        await citasDb.insertMany([
          {
            espacioId: espDemo._id,
            sesion: 1,
            propuestas: [en(-3), en(-2)],
            confirmada: en(-3),
            duracionMin: 60,
            canal: 'Meet',
            estado: 'confirmada',
            linkVideollamada: '',
            notas: 'Primera sesión',
            confirmadaPor: null,
            createdAt: en(-5),
            updatedAt: en(-4),
          },
          {
            espacioId: espDemo._id,
            sesion: 2,
            propuestas: [en(2), en(3)],
            confirmada: null,
            duracionMin: 60,
            canal: 'Meet',
            estado: 'propuesta',
            linkVideollamada: '',
            notas: 'Propuesta del cliente',
            confirmadaPor: null,
            createdAt: en(0),
            updatedAt: en(0),
          },
        ]);
      }

      // ---------------- 2) CLIENTE PAQUETE (paquete@daju.co) ----------------
      let paqueteCli = usuariosExist.find((u) => u.email === 'paquete@daju.co');
      if (!paqueteCli) {
        const res = await usuariosDb.insertOne({
          email: 'paquete@daju.co',
          passwordHash: await hash(PASS),
          nombre: 'Cliente Paquete',
          rol: 'cliente',
          activo: true,
          createdAt: ahora,
          updatedAt: ahora,
        });
        paqueteCli = { _id: res.insertedId };
      }

      const paqueteCorp = await paquetesDb.findOne({ slug: 'corporativo' });
      let proyecto = await proyectosDb.findOne({ clienteId: paqueteCli._id });
      let pagoPaquete = await pagosDb.findOne({
        emailCliente: 'paquete@daju.co',
        estado: 'paid',
      });
      if (!pagoPaquete) {
        const r = await pagosDb.insertOne({
          tipoProducto: 'paquete',
          paqueteSlug: 'corporativo',
          productoSlug: '',
          productoId: paqueteCorp._id,
          cantidad: 1,
          descripcion: 'Paquete Corporativo (seed)',
          monto: 499,
          moneda: 'USD',
          emailCliente: 'paquete@daju.co',
          clienteId: paqueteCli._id,
          estado: 'paid',
          referencia: 'seed-ref-paquete-1',
          metadata: {},
          createdAt: en(-20),
          updatedAt: en(-20),
        });
        pagoPaquete = { _id: r.insertedId };
      }
      if (!proyecto) {
        const r = await proyectosDb.insertOne({
          clienteId: paqueteCli._id,
          pagoId: pagoPaquete._id,
          paquete: {
            slug: 'corporativo',
            nombre: 'Paquete Corporativo',
            tipo: 'corporativo',
            vistasIncluidas: 4,
            soporteMeses: 6,
            diasEntrega: 25,
          },
          estado: 'desarrollo',
          fechaCompra: en(-20),
          fechaEntrega: en(15),
          funcionalidades: [
            { id: 'seed-f-1', nombre: 'Blog propio', complejidad: 'media', precio: 40 },
            { id: 'seed-f-2', nombre: 'Formularios con email', complejidad: 'facil', precio: 25 },
          ],
          createdAt: en(-20),
          updatedAt: en(-1),
        });
        proyecto = { _id: r.insertedId };
      }

      const briefing = await briefingsDb.findOne({ proyectoId: proyecto._id });
      if (!briefing) {
        await briefingsDb.insertOne({
          proyectoId: proyecto._id,
          clienteId: paqueteCli._id,
          contenido: {
            empresa: 'Ferretería La Silla',
            descripcionNegocio: 'Venta de herramientas y alquiler de maquinaria.',
            objetivos: 'Mostrar catálogo y recibir cotizaciones.',
            requerimientos: 'Formularios de cotización por correo.',
            resumen: {
              nombreProyecto: 'Web corporativa Ferretería',
              flujoPrincipal:
                'El cliente entra, ve el catálogo, pide una cotización y la recibimos por correo con su presupuesto.',
              ejemploFlujo:
                '1º entra → 2º busca herramienta → 3º pide cotización → 4º llega al correo → 5º llamamos para cerrar.',
              usuarios: { cantidad: 3, tipos: ['Admin', 'Vendedor', 'Cliente'], permisos: ['Admin: todo', 'Vendedor: pedidos', 'Cliente: solo consulta'] },
            },
            vistas: [
              { nombre: 'Home', requisitos: 'Logo grande, botón de cotizar arriba y testimonios.', semaforo: 'aprobada' },
              { nombre: 'Catálogo', requisitos: 'Filtros por categoría y precio.', semaforo: 'negociacion' },
              { nombre: 'Cotización', requisitos: 'Formulario con correo del cliente.', semaforo: 'pendiente' },
            ],
            identidad: {
              fuentes: { tipo: 'lista', valor: 'Legibles y amables', notas: '' },
              colores: { tipo: 'dev', valor: '', notas: '' },
              vibra: { tipo: 'libre', valor: 'Confiable pero cercana, nada frío', notas: '' },
            },
          },
          archivos: [],
          completado: true,
          createdAt: en(-15),
          updatedAt: en(-2),
        });

        await mensajesDb.insertMany([
          {
            contexto: 'proyecto',
            contextoId: proyecto._id,
            autorTipo: 'cliente',
            autorId: paqueteCli._id,
            cuerpo: '¿Podemos adelantar el Home antes del resto?',
            archivos: [],
            leidoPor: [paqueteCli._id],
            createdAt: en(-4),
            updatedAt: en(-4),
          },
          {
            contexto: 'proyecto',
            contextoId: proyecto._id,
            autorTipo: 'admin',
            autorId: paqueteCli._id,
            cuerpo: '¡Claro! Esta semana te mostraremos el boceto en obra gris.',
            archivos: [],
            leidoPor: [],
            createdAt: en(-3),
            updatedAt: en(-3),
          },
        ]);
      }

      // ---------------- 3) CLIENTE PLANTILLA (plantilla@daju.co) ----------------
      let plantillaCli = usuariosExist.find((u) => u.email === 'plantilla@daju.co');
      if (!plantillaCli) {
        const res = await usuariosDb.insertOne({
          email: 'plantilla@daju.co',
          passwordHash: await hash(PASS),
          nombre: 'Cliente Plantilla',
          rol: 'cliente',
          activo: true,
          createdAt: ahora,
          updatedAt: ahora,
        });
        plantillaCli = { _id: res.insertedId };
      }

      const plantillaReservas = await plantillasDb.findOne({ slug: 'reservas' });
      let pagoPl = await pagosDb.findOne({
        emailCliente: 'plantilla@daju.co',
        estado: 'paid',
      });
      if (!pagoPl) {
        const r = await pagosDb.insertOne({
          tipoProducto: 'plantilla',
          paqueteSlug: 'reservas',
          productoSlug: 'reservas',
          productoId: plantillaReservas._id,
          cantidad: 1,
          descripcion: 'Plantilla Reservas (seed)',
          monto: 299,
          moneda: 'USD',
          emailCliente: 'plantilla@daju.co',
          clienteId: plantillaCli._id,
          estado: 'paid',
          referencia: 'seed-ref-plantilla-1',
          metadata: {},
          createdAt: en(-8),
          updatedAt: en(-8),
        });
        pagoPl = { _id: r.insertedId };
      }
      let espPl =
        (await espaciosDb.findOne({ clienteId: plantillaCli._id })) ?? null;
      if (!espPl) {
        const r = await espaciosDb.insertOne({
          clienteId: plantillaCli._id,
          tipoProducto: 'plantilla',
          productoId: plantillaReservas._id,
          productoSlug: 'reservas',
          pagoId: pagoPl._id,
          estado: 'activo',
          sesiones: { total: 1, usadas: 0 },
          createdAt: en(-8),
          updatedAt: en(-8),
        });
        espPl = { _id: r.insertedId };
      }

      if ((await vistasDb.countDocuments({ espacioId: espPl._id })) === 0) {
        const v1 = await vistasDb.insertOne({
          espacioId: espPl._id,
          nombre: 'Portada',
          orden: 0,
          estado: 'negociacion',
          muestraCliente: { ...IMGS.vitrina1, nombre: 'referencia-cliente.jpg' },
          obraGris: { ...IMGS.obraGris1, nombre: 'obra-gris.jpg' },
          createdAt: en(-6),
          updatedAt: en(-1),
        });
        const v2 = await vistasDb.insertOne({
          espacioId: espPl._id,
          nombre: 'Calendario',
          orden: 1,
          estado: 'aprobada',
          muestraCliente: null,
          obraGris: { ...IMGS.obraGris2, nombre: 'obra-gris-calendario.jpg' },
          createdAt: en(-6),
          updatedAt: en(-2),
        });

        await mensajesDb.insertMany([
          {
            contexto: 'vista',
            contextoId: v1._id ?? v1.insertedId,
            autorTipo: 'cliente',
            autorId: plantillaCli._id,
            cuerpo: 'Quiero la portada con el logo centrado y un botón grande de reservar.',
            archivos: [],
            leidoPor: [plantillaCli._id],
            createdAt: en(-5),
            updatedAt: en(-5),
          },
          {
            contexto: 'vista',
            contextoId: v1._id ?? v1.insertedId,
            autorTipo: 'admin',
            autorId: plantillaCli._id,
            cuerpo: 'Aquí va la primera propuesta en obra gris; ajustamos colores de marca.',
            archivos: [
              { url: IMGS.obraGris1, publicId: 'seed-obra-gris-vista', nombre: 'obra-gris.jpg', mime: 'image/png' },
            ],
            leidoPor: [],
            createdAt: en(-4),
            updatedAt: en(-4),
          },
          {
            contexto: 'espacio',
            contextoId: espPl._id,
            autorTipo: 'cliente',
            autorId: plantillaCli._id,
            cuerpo: '¡Buenas! La plantilla me gusta, ¿podemos ver el listado de reservas?',
            archivos: [],
            leidoPor: [plantillaCli._id],
            createdAt: en(-3),
            updatedAt: en(-3),
          },
          {
            contexto: 'espacio',
            contextoId: espPl._id,
            autorTipo: 'admin',
            autorId: plantillaCli._id,
            cuerpo: 'Claro, lo trabajamos esta semana y te dejamos feedback en la vista.',
            archivos: [],
            leidoPor: [],
            createdAt: en(-2),
            updatedAt: en(-2),
          },
        ]);

        await solicitudesDb.insertMany([
          {
            espacioId: espPl._id,
            titulo: 'Exportar reservas a Excel',
            descripcion: 'Los clientes quieren el reporte mensual en Excel.',
            estado: 'respondida',
            costo: 45,
            respuestaAdmin: 'Costo estimado: $45 USD. Confirmá y lo programamos.',
            respondidaPor: null,
            createdAt: en(-5),
            updatedAt: en(-2),
          },
          {
            espacioId: espPl._id,
            titulo: 'Recordatorios por WhatsApp',
            descripcion: 'Avisar 24 h antes de cada cita por WhatsApp.',
            estado: 'abierta',
            costo: 0,
            respuestaAdmin: '',
            respondidaPor: null,
            createdAt: en(-1),
            updatedAt: en(-1),
          },
        ]);
      }
    });
    await sesion.endSession();
  },

  async down(db, client) {
    const sesion = client.startSession();
    await sesion.withTransaction(async () => {
      const emails = ['demo@daju.co', 'paquete@daju.co', 'plantilla@daju.co'];
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
    });
    await sesion.endSession();
  },
};
