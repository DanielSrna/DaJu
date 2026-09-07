import request from "supertest";
import { createApp } from "../src/app";
import { EspacioModel } from "../src/models/espacio.model";import { MensajeModel } from "../src/models/mensaje.model";
import { CitaModel } from "../src/models/cita.model";
import { SolicitudFuncionModel } from "../src/models/solicitud-funcion.model";
import { VistaDisenoModel } from "../src/models/vista-diseno.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { BriefingModel } from "../src/models/briefing.model";
import { PagoModel } from "../src/models/pago.model";
import { ServicioModel } from "../src/models/servicio.model";
import { PlantillaModel } from "../src/models/plantilla.model";
import { UserModel } from "../src/models/user.model";
import bcrypt from "bcryptjs";

const FECHA_LIBRE = new Date(Date.now() + 5 * 86_400_000 + 3600_000 * 10);
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

class FakeProvider {
  async createCheckout(_p: Record<string, unknown>) {
    return {
      paymentId: `ref-${Math.random()}`,
      status: "pending",
      checkoutUrl: "https://checkout.epayco.test/pagar",
    };
  }
  async handleWebhook(_b: Record<string, unknown>) {
    return { eventType: "payment.paid", paymentId: "sol-ref-1", status: "paid" };
  }
}

const FIRST_LATER = new Date(Date.now() + 2 * 86_400_000);
const SECOND_LATER = new Date(Date.now() + 3 * 86_400_000);

describe("Portal del cliente (fase 2)", () => {
  const app = createApp();

  async function creaUsuario(
    email: string,
    rol: "admin" | "cliente",
  ): Promise<{ id: string; cookies: string[] }> {
    const user = await UserModel.create({
      email,
      passwordHash: bcrypt.hashSync("Clave123", 12),
      nombre: rol === "admin" ? "Admin" : "Cliente",
      rol,
    });
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "Clave123" });
    return { id: String(user._id), cookies: login.headers["set-cookie"] as unknown as string[] };
  }

  async function creaServicio() {
    return ServicioModel.create({
      nombre: "Asesoría técnica",
      slug: "asesoria-tecnica",
      categoria: "asesoria",
      descripcion: "Asesoría 1:1",
      precio: 90,
      moneda: "USD",
      duracionMin: 60,
      canal: "Meet",
    });
  }

  async function compraEspacio(clienteId: string, cantidad: number) {
    const servicio = await creaServicio();
    const pago = await PagoModel.create({
      tipoProducto: "servicio",
      paqueteSlug: "asesoria-tecnica",
      productoSlug: "asesoria-tecnica",
      productoId: servicio._id,
      cantidad,
      descripcion: "Asesoría × 2",
      monto: 90 * cantidad,
      moneda: "USD",
      emailCliente: "c@c.com",
      clienteId,
      estado: "paid",
      referencia: `ref-${Date.now()}-${Math.random()}`,
    });
    const servicioDoc = await ServicioModel.findById(servicio._id);
    // Espacio directo (el webhook ya fue probado en checkout-multiproducto):
    const { espacioService } = await import("../src/services/espacio.service");
    return await espacioService.crearDesdePago({
      pagoId: String(pago._id),
      clienteId,
      tipoProducto: "servicio",
      productoId: String(servicio._id),
      productoSlug: servicioDoc!.slug,
      sesionesTotal: cantidad,
    });
  }
  beforeEach(async () => {
    await Promise.all([
      EspacioModel.deleteMany({}),
      MensajeModel.deleteMany({}),
      CitaModel.deleteMany({}),
      SolicitudFuncionModel.deleteMany({}),
      VistaDisenoModel.deleteMany({}),
      ProyectoModel.deleteMany({}),
      BriefingModel.deleteMany({}),
      PagoModel.deleteMany({}),
      ServicioModel.deleteMany({}),
      PlantillaModel.deleteMany({}),
      UserModel.deleteMany({}),
    ]);
  });

  it("crea el espacio desde un pago confirmado (idempotente)", async () => {
    const cliente = await UserModel.create({
      email: "a@a.com",
      passwordHash: bcrypt.hashSync("Clave123", 12),
      nombre: "A",
      rol: "cliente",
    });
    const servicio = await creaServicio();
    const pago = await PagoModel.create({
      tipoProducto: "servicio",
      paqueteSlug: servicio.slug,
      productoSlug: servicio.slug,
      productoId: servicio._id,
      cantidad: 3,
      descripcion: "x",
      monto: 270,
      moneda: "USD",
      emailCliente: "a@a.com",
      clienteId: cliente._id,
      estado: "paid",
      referencia: "ref-uniq-1",
    });
    const { espacioService } = await import("../src/services/espacio.service");

    const primero = await espacioService.crearDesdePago({
      pagoId: String(pago._id),
      clienteId: String(cliente._id),
      tipoProducto: "servicio",
      productoId: String(servicio._id),
      productoSlug: servicio.slug,
      sesionesTotal: 3,
    });
    const segundo = await espacioService.crearDesdePago({
      pagoId: String(pago._id),
      clienteId: String(cliente._id),
      tipoProducto: "servicio",
      productoId: String(servicio._id),
      productoSlug: servicio.slug,
      sesionesTotal: 3,
    });

    expect(primero.id).toBe(segundo.id);
    expect(await EspacioModel.countDocuments({})).toBe(1);
  });

  it("GET /cliente/resumen devuelve solo lo del cliente autenticado", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const b = await creaUsuario("b@b.com", "cliente");
    await compraEspacio(a.id, 2);

    const res = await request(app)
      .get("/api/v1/cliente/resumen")
      .set("Cookie", a.cookies);

    expect(res.status).toBe(200);
    expect(res.body.espacios).toHaveLength(1);
    expect(res.body.espacios[0].sesiones).toEqual({ total: 2, usadas: 0 });

    const resB = await request(app)
      .get("/api/v1/cliente/resumen")
      .set("Cookie", b.cookies);
    expect(resB.status).toBe(200);
    expect(resB.body.espacios).toHaveLength(0);
  });

  it("chat: el propietario puede leer/escribir; otro cliente no", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const b = await creaUsuario("b@b.com", "cliente");
    const espacio = await compraEspacio(a.id, 1);

    const post = await request(app)
      .post("/api/v1/mensajes")
      .set("Cookie", a.cookies)
      .send({ contexto: "espacio", contextoId: espacio.id, cuerpo: "Hola" });
    expect(post.status).toBe(201);

    const lista = await request(app)
      .get(`/api/v1/mensajes?contexto=espacio&contextoId=${espacio.id}`)
      .set("Cookie", a.cookies);
    expect(lista.status).toBe(200);
    expect(lista.body.mensajes).toHaveLength(1);
    expect(lista.body.mensajes[0].cuerpo).toBe("Hola");

    const ajeno = await request(app)
      .get(`/api/v1/mensajes?contexto=espacio&contextoId=${espacio.id}`)
      .set("Cookie", b.cookies);
    expect(ajeno.status).toBe(403);
  });

  it("flujo de cita: proponer → confirmar → realizar consume la sesión", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const admin = await creaUsuario("admin@x.com", "admin");
    const espacio = await compraEspacio(a.id, 1);

    const propuesta = await request(app)
      .post(`/api/v1/espacios/${espacio.id}/citas`)
      .set("Cookie", a.cookies)
      .send({ propuestas: [FIRST_LATER.toISOString(), SECOND_LATER.toISOString()] });
    expect(propuesta.status).toBe(201);
    expect(propuesta.body.cita.estado).toBe("propuesta");
    const citaId = propuesta.body.cita.id as string;

    const confirmar = await request(app)
      .post(`/api/v1/citas/${citaId}/confirmar`)
      .set("Cookie", admin.cookies)
      .send({ franja: FIRST_LATER.toISOString(), linkVideollamada: "https://meet.test/x" });
    expect(confirmar.status).toBe(200);
    expect(confirmar.body.cita.estado).toBe("confirmada");

    const realizar = await request(app)
      .post(`/api/v1/citas/${citaId}/realizar`)
      .set("Cookie", admin.cookies);
    expect(realizar.status).toBe(200);
    expect(realizar.body.cita.estado).toBe("realizada");

    const espacioDoc = await EspacioModel.findById(espacio.id);
    expect(espacioDoc!.sesiones!.usadas).toBe(1);

    // No quedan sesiones
    const segunda = await request(app)
      .post(`/api/v1/espacios/${espacio.id}/citas`)
      .set("Cookie", a.cookies)
      .send({ propuestas: [SECOND_LATER.toISOString()] });
    expect(segunda.status).toBe(400);
  });

  it("vistas de plantilla: crear y cambiar estado por admin", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const admin = await creaUsuario("admin@x.com", "admin");
    const espacio = await compraEspacio(a.id, 1);

    const creada = await request(app)
      .post(`/api/v1/espacios/${espacio.id}/vistas`)
      .set("Cookie", admin.cookies)
      .send({ nombre: "Vista de portada" });
    expect(creada.status).toBe(201);

    const vistaId = creada.body.vista.id as string;
    const estado = await request(app)
      .put(`/api/v1/vistas/${vistaId}`)
      .set("Cookie", admin.cookies)
      .send({ estado: "aprobada" });
    expect(estado.status).toBe(200);
    expect(estado.body.vista.estado).toBe("aprobada");
  });

  it("solicitud de función: crear → responder admin → aceptar cliente", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const admin = await creaUsuario("admin@x.com", "admin");
    const espacio = await compraEspacio(a.id, 1);

    const creada = await request(app)
      .post(`/api/v1/espacios/${espacio.id}/solicitudes`)
      .set("Cookie", a.cookies)
      .send({ titulo: "Exportar a Excel", descripcion: "Reportes descargables" });
    expect(creada.status).toBe(201);
    const solId = creada.body.solicitud.id as string;

    const respondida = await request(app)
      .put(`/api/v1/solicitudes/${solId}`)
      .set("Cookie", admin.cookies)
      .send({ costo: 45, respuestaAdmin: "Costo estimado: 45 USD" });
    expect(respondida.status).toBe(200);
    expect(respondida.body.solicitud.estado).toBe("respondida");
    expect(respondida.body.solicitud.costo).toBe(45);

    const aceptada = await request(app)
      .post(`/api/v1/solicitudes/${solId}/aceptar`)
      .set("Cookie", a.cookies);
    expect(aceptada.status).toBe(201);
    expect(typeof aceptada.body.urlPago).toBe("string");
    expect(aceptada.body.pago.tipoProducto).toBe("funcionalidad");
  });

  it("vista del briefing: cambia requisitos el cliente y semáforo el admin", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const admin = await creaUsuario("admin@x.com", "admin");
    const proyecto = await ProyectoModel.create({
      clienteId: a.id,
      pagoId: new (await import("mongoose")).Types.ObjectId(),
      paquete: {
        slug: "validor",
        nombre: "Paquete Validor",
        tipo: "validor",
        vistasIncluidas: 1,
        soporteMeses: 2,
        diasEntrega: 10,
      },
      estado: "recibido",
      fechaCompra: new Date(),
      fechaEntrega: new Date(),
    });
    const briefing = await BriefingModel.create({
      proyectoId: proyecto._id,
      clienteId: a.id,
      contenido: { vistas: [{ nombre: "Home", requisitos: "", semaforo: "pendiente" }] },
    });
    const vistaId = String(briefing.contenido!.vistas![0]!._id);

    const cliente = await request(app)
      .put(`/api/v1/briefing/${proyecto._id}/vistas/${vistaId}`)
      .set("Cookie", a.cookies)
      .send({ requisitos: "Quiero el logo arriba a la derecha" });
    expect(cliente.status).toBe(200);
    expect(cliente.body.briefing.contenido.vistas[0].requisitos).toContain("logo");

    const adminUpd = await request(app)
      .put(`/api/v1/briefing/${proyecto._id}/vistas/${vistaId}`)
      .set("Cookie", admin.cookies)
      .send({ semaforo: "negociacion" });
    expect(adminUpd.status).toBe(200);
    expect(adminUpd.body.briefing.contenido.vistas[0].semaforo).toBe("negociacion");

    // El cliente puede sumar una función nueva (una vista = una función)
    const agregada = await request(app)
      .post(`/api/v1/briefing/${proyecto._id}/vistas`)
      .set("Cookie", a.cookies)
      .send({ nombre: "Blog propio" });
    expect(agregada.status).toBe(201);
    expect(agregada.body.briefing.contenido.vistas).toHaveLength(2);
    expect(agregada.body.briefing.contenido.vistas[1].semaforo).toBe("cotizacion");

    // La vista abre su negociación: solicitud abierta
    const lista = await request(app)
      .get(`/api/v1/proyectos/${proyecto._id}/solicitudes`)
      .set("Cookie", a.cookies);
    expect(lista.status).toBe(200);
    expect(lista.body.solicitudes).toHaveLength(1);
    const solicitudIdUnused = lista.body.solicitudes[0].id as string;
    void solicitudIdUnused;
    expect(lista.body.solicitudes[0].estado).toBe("abierta");
  });

  it("paquete completo: negociar → cotizar → pagar → vista aprobada", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const admin = await creaUsuario("admin@x.com", "admin");
    const proyecto = await ProyectoModel.create({
      clienteId: a.id,
      pagoId: new (await import("mongoose")).Types.ObjectId(),
      paquete: {
        slug: "validor",
        nombre: "Paquete Validor",
        tipo: "validor",
        vistasIncluidas: 1,
        soporteMeses: 2,
        diasEntrega: 10,
      },
      estado: "recibido",
      fechaCompra: new Date(),
      fechaEntrega: new Date(),
    });
    const briefing = await BriefingModel.create({
      proyectoId: proyecto._id,
      clienteId: a.id,
      contenido: { vistas: [] },
    });

    // 1) Cliente agrega función → solicitud abierta
    await request(app)
      .post(`/api/v1/briefing/${proyecto._id}/vistas`)
      .set("Cookie", a.cookies)
      .send({ nombre: "Catálogo" });
    const lista = await request(app)
      .get(`/api/v1/proyectos/${proyecto._id}/solicitudes`)
      .set("Cookie", a.cookies);
    const solicitudId = lista.body.solicitudes[0].id as string;

    // 2) Admin cotiza
    const respondida = await request(app)
      .put(`/api/v1/solicitudes/${solicitudId}`)
      .set("Cookie", admin.cookies)
      .send({ costo: 90, respuestaAdmin: "Costo: $90 USD" });
    expect(respondida.status).toBe(200);

    // 3) Cliente acepta y paga (checkout de funcionalidad)
    const pagar = await request(app)
      .post(`/api/v1/solicitudes/${solicitudId}/aceptar`)
      .set("Cookie", a.cookies);
    expect(pagar.status).toBe(201);
    expect(pagar.body.pago.monto).toBe(90);
    const pagoDoc = await PagoModel.findById(pagar.body.pago.id);

    // 4) Webhook pagado → solicitud "pagada" + vista aprobada
    const { PagoService } = await import("../src/services/pago.service");
    const service = new PagoService(new FakeProvider() as never);
    pagoDoc!.referencia = "sol-ref-1";
    await pagoDoc!.save();
    await service.procesarWebhook({});

    const solFinal = await SolicitudFuncionModel.findById(solicitudId);
    expect(solFinal!.estado).toBe("pagada");
    const briefFinal = await BriefingModel.findById(briefing._id);
    expect(briefFinal!.contenido!.vistas![0]!.semaforo).toBe("pendiente");
  });

  it("notificaciones: compra → admins (plataforma) y novedad de chat → admins", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const admin = await creaUsuario("admin@x.com", "admin");
    const espacio = await compraEspacio(a.id, 1);

    // Novedad del cliente en el chat → notificación para admins
    await request(app)
      .post("/api/v1/mensajes")
      .set("Cookie", a.cookies)
      .send({ contexto: "espacio", contextoId: espacio.id, cuerpo: "Necesito ayuda" });
    await request(app)
      .post("/api/v1/mensajes")
      .set("Cookie", a.cookies)
      .send({ contexto: "espacio", contextoId: espacio.id, cuerpo: "¿Me confirman la cita?" });

    const adminList = await request(app)
      .get("/api/v1/notificaciones")
      .set("Cookie", admin.cookies);
    expect(adminList.status).toBe(200);
    const deChat = adminList.body.notificaciones.filter(
      (n: { titulo: string }) => n.titulo.includes("chat"),
    );
    expect(deChat.length).toBeGreaterThanOrEqual(2);

    // El cliente también recibe respuestas del admin
    await request(app)
      .post("/api/v1/mensajes")
      .set("Cookie", admin.cookies)
      .send({ contexto: "espacio", contextoId: espacio.id, cuerpo: "Sí, te confirmamos." });
    const clienteList = await request(app)
      .get("/api/v1/notificaciones")
      .set("Cookie", a.cookies);
    expect(
      clienteList.body.notificaciones.some(
        (n: { titulo: string }) => n.titulo.includes("equipo respondió"),
      ),
    ).toBe(true);

    // badge sin leer
    const sinLeer = await request(app)
      .get("/api/v1/notificaciones/sin-leer")
      .set("Cookie", a.cookies);
    expect(Number(sinLeer.body.total)).toBeGreaterThan(0);

    // marcar leída
    const primera = clienteList.body.notificaciones[0].id as string;
    await request(app)
      .put(`/api/v1/notificaciones/${primera}/leida`)
      .set("Cookie", a.cookies)
      .expect(204);
  });

  it("aceptar solicitud genera checkout de funcionalidad (una sola vez)", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const admin = await creaUsuario("admin@x.com", "admin");
    const espacio = await compraEspacio(a.id, 1);

    const creada = await request(app)
      .post(`/api/v1/espacios/${espacio.id}/solicitudes`)
      .set("Cookie", a.cookies)
      .send({ titulo: "Exportar a Excel", descripcion: "Reportes descargables" });
    const solId = creada.body.solicitud.id as string;

    await request(app)
      .put(`/api/v1/solicitudes/${solId}`)
      .set("Cookie", admin.cookies)
      .send({ costo: 45, respuestaAdmin: "Costo: $45 USD" });

    const pagar = await request(app)
      .post(`/api/v1/solicitudes/${solId}/aceptar`)
      .set("Cookie", a.cookies);
    expect(pagar.status).toBe(201);
    expect(pagar.body.urlPago).toBe("https://checkout.epayco.test/pagar");
    expect(pagar.body.pago.tipoProducto).toBe("funcionalidad");
    expect(pagar.body.pago.monto).toBe(45);

    const repetido = await request(app)
      .post(`/api/v1/solicitudes/${solId}/aceptar`)
      .set("Cookie", a.cookies);
    expect(repetido.status).toBe(409);

    const solicitud = await SolicitudFuncionModel.findById(solId);
    expect(solicitud!.estado).toBe("aceptada");
  });

  it("no se puede confirmar la misma franja en dos citas distintas", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const admin = await creaUsuario("admin@x.com", "admin");
    const espacio = await compraEspacio(a.id, 2);

    const p1 = await request(app)
      .post(`/api/v1/espacios/${espacio.id}/citas`)
      .set("Cookie", a.cookies)
      .send({ propuestas: [FECHA_LIBRE.toISOString()] });
    const cita1 = p1.body.cita.id as string;

    await request(app)
      .post(`/api/v1/citas/${cita1}/confirmar`)
      .set("Cookie", admin.cookies)
      .send({ franja: FECHA_LIBRE.toISOString() });

    const p2 = await request(app)
      .post(`/api/v1/espacios/${espacio.id}/citas`)
      .set("Cookie", a.cookies)
      .send({ propuestas: [FECHA_LIBRE.toISOString()] });
    // La franja ya está confirmada: la propuesta debe rechazarse.
    expect(p2.status).toBe(400);
  });

  it("vista de plantilla: el propietario sube archivos y otro cliente no", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const b = await creaUsuario("b@b.com", "cliente");
    const espacio = await compraEspacio(a.id, 1);
    const creada = await request(app)
      .post(`/api/v1/espacios/${espacio.id}/vistas`)
      .set("Cookie", a.cookies)
      .send({ nombre: "Vista de portada" });
    const vistaId = creada.body.vista.id as string;

    const subida = await request(app)
      .post(`/api/v1/vistas/${vistaId}/archivos`)
      .set("Cookie", a.cookies)
      .attach("archivo", PNG_1PX, "referencia.png");
    expect(subida.status).toBe(201);
    expect(subida.body.vista.archivos).toHaveLength(1);
    expect(subida.body.vista.archivos[0].mimeType).toBe("image/png");

    const ajeno = await request(app)
      .post(`/api/v1/vistas/${vistaId}/archivos`)
      .set("Cookie", b.cookies)
      .attach("archivo", PNG_1PX, "robo.png");
    expect(ajeno.status).toBe(403);
  });

  it("briefing: admin publica obra gris y el cliente suma un archivo a su vista", async () => {
    const a = await creaUsuario("a@a.com", "cliente");
    const admin = await creaUsuario("admin@x.com", "admin");
    const proyecto = await ProyectoModel.create({
      clienteId: a.id,
      pagoId: new (await import("mongoose")).Types.ObjectId(),
      paquete: {
        slug: "validor",
        nombre: "Paquete Validor",
        tipo: "validor",
        vistasIncluidas: 1,
        soporteMeses: 2,
        diasEntrega: 10,
      },
      estado: "recibido",
      fechaCompra: new Date(),
      fechaEntrega: new Date(),
    });
    const briefing = await BriefingModel.create({
      proyectoId: proyecto._id,
      clienteId: a.id,
      contenido: { vistas: [{ nombre: "Home", requisitos: "", semaforo: "pendiente" }] },
    });
    const vistaId = String(briefing.contenido!.vistas![0]!._id);

    const obra = await request(app)
      .post(`/api/v1/briefing/${proyecto._id}/vistas/${vistaId}/obra-gris`)
      .set("Cookie", admin.cookies)
      .attach("imagen", PNG_1PX, "obra-gris.png");
    expect(obra.status).toBe(200);
    expect(obra.body.briefing.contenido.vistas[0].obraGris).not.toBeNull();

    const clienteNoAdmin = await request(app)
      .post(`/api/v1/briefing/${proyecto._id}/vistas/${vistaId}/obra-gris`)
      .set("Cookie", a.cookies)
      .attach("imagen", PNG_1PX, "no-obra.png");
    expect(clienteNoAdmin.status).toBe(403);

    const archivo = await request(app)
      .post(`/api/v1/briefing/${proyecto._id}/vistas/${vistaId}/archivos`)
      .set("Cookie", a.cookies)
      .attach("archivo", PNG_1PX, "temp.png");
    expect(archivo.status).toBe(201);
    expect(archivo.body.briefing.contenido.vistas[0].archivos).toHaveLength(1);
  });

  it("auth: solicitar restablecimiento genera token y se puede usar 1 vez", async () => {
    await creaUsuario("a@a.com", "cliente");
    const solicitud = await request(app)
      .post("/api/v1/auth/forgot")
      .send({ email: "a@a.com" });
    expect(solicitud.status).toBe(200);

    const usuario = await UserModel.findOne({ email: "a@a.com" }).select("+passwordResetToken");
    expect(usuario!.passwordResetToken).toBeTruthy();

    const invalido = await request(app)
      .post("/api/v1/auth/reset")
      .send({ token: "no-existe", password: "Clave123" });
    expect(invalido.status).toBe(400);

    const ok = await request(app)
      .post("/api/v1/auth/reset")
      .send({ token: usuario!.passwordResetToken, password: "Nueva123" });
    expect(ok.status).toBe(200);
  });

  it("métricas de admin: ingresos del mes y contadores", async () => {
    const admin = await creaUsuario("admin@x.com", "admin");
    const a = await creaUsuario("a@a.com", "cliente");
    await compraEspacio(a.id, 2);

    const res = await request(app)
      .get("/api/v1/admin/metricas")
      .set("Cookie", admin.cookies);
    expect(res.status).toBe(200);
    expect(res.body.ingresosMes).toBeGreaterThanOrEqual(180);
    expect(res.body.proyectosActivos).toBeGreaterThanOrEqual(0);
    expect(res.body.entornosPlantillas).toBeGreaterThanOrEqual(0);
    expect(res.body.entornosServicios).toBeGreaterThanOrEqual(1);
    expect(res.body.sesionesPendientes).toBeGreaterThanOrEqual(1);

    const noAdmin = await request(app)
      .get("/api/v1/admin/metricas")
      .set("Cookie", a.cookies);
    expect(noAdmin.status).toBe(403);
  });
});
