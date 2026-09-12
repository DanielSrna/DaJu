import request from "supertest";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { PagoModel } from "../src/models/pago.model";
import { MetodoPagoModel } from "../src/models/metodo-pago.model";
import { CmsConfigModel } from "../src/models/cms-config.model";

const app = createApp();

const paqueteSeed = {
  nombre: "Paquete Operativo",
  slug: "operativo",
  tipo: "operativo" as const,
  descripcion: "Mini dashboard con métricas",
  precio: 999,
  moneda: "USD",
  vistasIncluidas: 4,
  soporteMeses: 12,
  diasEntrega: 30,
};

async function crearAdmin(): Promise<string[]> {
  await UserModel.create({
    email: "admin@mainplataform.com",
    passwordHash: bcrypt.hashSync("Admin1234", 12),
    nombre: "Admin",
    rol: "admin",
  });
  const login = await request(app).post("/api/v1/auth/login").send({
    email: "admin@mainplataform.com",
    password: "Admin1234",
  });
  return login.headers["set-cookie"] as unknown as string[];
}

async function clienteConProyecto(): Promise<{
  cookies: string[];
  proyectoId: string;
  clienteId: string;
}> {
  const paquete = await PaqueteModel.create(paqueteSeed);
  const cotizacion = await request(app).post("/api/v1/cotizaciones").send({
    tipoProducto: "paquete",
    paqueteId: String(paquete._id),
    nombre: "Ana",
    primerApellido: "Pérez",
    fechaNacimiento: "1995-04-12",
    aceptaCondiciones: true,
    aceptaDatos: true,
    email: "ana@correo.com",
    password: "Clave123",
  });
  const cookies = cotizacion.headers["set-cookie"] as unknown as string[];
  const usuario = await UserModel.findOne({
    email: "ana@correo.com",
  }).select("+emailVerificacionToken");
  await request(app)
    .post("/api/v1/auth/verificar-email")
    .send({ token: usuario!.emailVerificacionToken });
  return {
    cookies,
    proyectoId: cotizacion.body.entorno.id as string,
    clienteId: cotizacion.body.usuario.id as string,
  };
}

async function crearMetodos(): Promise<void> {
  await MetodoPagoModel.create([
    {
      nombre: "Nequi",
      clave: "nequi",
      tipo: "manual",
      moneda: "COP",
      titular: "DaJu Platform",
      datos: "300 000 0000",
      instrucciones: "Paga y escribe {codigo}",
      activo: true,
      orden: 1,
    },
    {
      nombre: "PayPal",
      clave: "paypal",
      tipo: "paypal",
      moneda: "USD",
      activo: true,
      orden: 2,
    },
    {
      nombre: "Método viejo",
      clave: "metodo-viejo",
      tipo: "manual",
      moneda: "COP",
      activo: false,
      orden: 3,
    },
  ]);
  await CmsConfigModel.create({ tasaCop: 4000 });
}

async function etapaIdDe(proyectoId: string): Promise<string> {
  const proyecto = await ProyectoModel.findById(proyectoId);
  const etapa = proyecto!.etapas[0] as unknown as { _id: unknown };
  return String(etapa._id);
}

describe("Pagos manuales (transferencias + PayPal)", () => {
  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      PaqueteModel.deleteMany({}),
      ProyectoModel.deleteMany({}),
      PagoModel.deleteMany({}),
      MetodoPagoModel.deleteMany({}),
      CmsConfigModel.deleteMany({}),
    ]);
  });

  it("flujo completo: solicitar → comprobante → confirmar → proyecto iniciado", async () => {
    const admin = await crearAdmin();
    const { cookies, proyectoId } = await clienteConProyecto();
    await crearMetodos();
    const etapaId = await etapaIdDe(proyectoId);

    const solicitud = await request(app)
      .post("/api/v1/pagos/solicitar")
      .set("Cookie", admin)
      .send({ proyectoId, etapaId, tipoPago: "etapa", monto: 400 });

    expect(solicitud.status).toBe(201);
    expect(solicitud.body.pago.codigo).toMatch(/^DJ-[A-Z2-9]{5}$/);
    const pagoId = solicitud.body.pago.id as string;

    const trasSolicitud = await ProyectoModel.findById(proyectoId);
    expect(trasSolicitud!.etapas[0].pagoEstado).toBe("solicitado");

    const metodo = await request(app)
      .post(`/api/v1/pagos/${pagoId}/metodo`)
      .set("Cookie", cookies)
      .send({ metodo: "nequi" });
    expect(metodo.status).toBe(200);
    expect(metodo.body.montoCop).toBe(400 * 4000);
    expect(metodo.body.urlPago).toBeNull();

    const png = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();
    const subida = await request(app)
      .post(`/api/v1/pagos/${pagoId}/comprobante`)
      .set("Cookie", cookies)
      .attach("archivo", png, "comprobante.png")
      .field("referenciaCliente", "TX-123");
    expect(subida.status).toBe(200);
    expect(subida.body.pago.estado).toBe("en_revision");
    expect(subida.body.pago.comprobante.url).toBeTruthy();

    const porVerificar = await request(app)
      .get("/api/v1/pagos/por-verificar")
      .set("Cookie", admin);
    expect(
      porVerificar.body.pagos.map((p: { id: string }) => p.id),
    ).toContain(pagoId);

    const confirmacion = await request(app)
      .post(`/api/v1/pagos/${pagoId}/confirmar`)
      .set("Cookie", admin);
    expect(confirmacion.status).toBe(200);
    expect(confirmacion.body.pago.estado).toBe("paid");

    const final = await ProyectoModel.findById(proyectoId);
    expect(final!.estado).toBe("recibido");
    expect(final!.fechaCompra).not.toBeNull();
    expect(final!.fechaEntrega).not.toBeNull();
    expect(final!.etapas[0].pagoEstado).toBe("pagado");
    expect(final!.etapas[0].estado).toBe("en_curso");

    // Idempotente: confirmar de nuevo no duplica ni rompe.
    await request(app)
      .post(`/api/v1/pagos/${pagoId}/confirmar`)
      .set("Cookie", admin);
    expect(await PagoModel.countDocuments({ estado: "paid" })).toBe(1);
  });

  it("rechaza el comprobante y permite volver a subirlo", async () => {
    const admin = await crearAdmin();
    const { cookies, proyectoId } = await clienteConProyecto();
    await crearMetodos();
    const etapaId = await etapaIdDe(proyectoId);

    const solicitud = await request(app)
      .post("/api/v1/pagos/solicitar")
      .set("Cookie", admin)
      .send({ proyectoId, etapaId, tipoPago: "etapa", monto: 400 });
    const pagoId = solicitud.body.pago.id as string;

    const png = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();
    await request(app)
      .post(`/api/v1/pagos/${pagoId}/comprobante`)
      .set("Cookie", cookies)
      .attach("archivo", png, "comprobante.png");

    const rechazo = await request(app)
      .post(`/api/v1/pagos/${pagoId}/rechazar`)
      .set("Cookie", admin)
      .send({ motivo: "El código no aparece en la transacción" });
    expect(rechazo.status).toBe(200);
    expect(rechazo.body.pago.estado).toBe("rechazado");
    expect(rechazo.body.pago.motivoRechazo).toContain("código");

    const resubida = await request(app)
      .post(`/api/v1/pagos/${pagoId}/comprobante`)
      .set("Cookie", cookies)
      .attach("archivo", png, "comprobante-2.png");
    expect(resubida.status).toBe(200);
    expect(resubida.body.pago.estado).toBe("en_revision");
    expect(resubida.body.pago.motivoRechazo).toBe("");
  });

  it("no permite cobrar dos veces la misma etapa", async () => {
    const admin = await crearAdmin();
    const { proyectoId } = await clienteConProyecto();
    const etapaId = await etapaIdDe(proyectoId);

    const primera = await request(app)
      .post("/api/v1/pagos/solicitar")
      .set("Cookie", admin)
      .send({ proyectoId, etapaId, tipoPago: "etapa", monto: 400 });
    expect(primera.status).toBe(201);

    const duplicada = await request(app)
      .post("/api/v1/pagos/solicitar")
      .set("Cookie", admin)
      .send({ proyectoId, etapaId, tipoPago: "etapa", monto: 400 });
    expect(duplicada.status).toBe(409);
  });

  it("PayPal: elegir método devuelve URL y capturar confirma el pago", async () => {
    const admin = await crearAdmin();
    const { cookies, proyectoId } = await clienteConProyecto();
    await crearMetodos();
    const etapaId = await etapaIdDe(proyectoId);

    const solicitud = await request(app)
      .post("/api/v1/pagos/solicitar")
      .set("Cookie", admin)
      .send({ proyectoId, etapaId, tipoPago: "etapa", monto: 500 });
    const pagoId = solicitud.body.pago.id as string;

    const metodo = await request(app)
      .post(`/api/v1/pagos/${pagoId}/metodo`)
      .set("Cookie", cookies)
      .send({ metodo: "paypal" });
    expect(metodo.status).toBe(200);
    expect(metodo.body.urlPago).toBeTruthy();

    const captura = await request(app)
      .post(`/api/v1/pagos/${pagoId}/paypal/capturar`)
      .set("Cookie", cookies);
    expect(captura.status).toBe(200);
    expect(captura.body.pago.estado).toBe("paid");

    const proyecto = await ProyectoModel.findById(proyectoId);
    expect(proyecto!.fechaCompra).not.toBeNull();
  });

  it("rechaza comprobantes que no son imagen ni PDF", async () => {
    const admin = await crearAdmin();
    const { cookies, proyectoId } = await clienteConProyecto();
    await crearMetodos();
    const etapaId = await etapaIdDe(proyectoId);

    const solicitud = await request(app)
      .post("/api/v1/pagos/solicitar")
      .set("Cookie", admin)
      .send({ proyectoId, etapaId, tipoPago: "etapa", monto: 400 });
    const pagoId = solicitud.body.pago.id as string;

    const subida = await request(app)
      .post(`/api/v1/pagos/${pagoId}/comprobante`)
      .set("Cookie", cookies)
      .attach("archivo", Buffer.from("no soy un archivo válido"), "x.txt");
    expect(subida.status).toBe(400);
  });

  it("el cliente no puede confirmar ni ver pagos ajenos", async () => {
    const admin = await crearAdmin();
    const { cookies, proyectoId } = await clienteConProyecto();
    await crearMetodos();
    const etapaId = await etapaIdDe(proyectoId);

    const solicitud = await request(app)
      .post("/api/v1/pagos/solicitar")
      .set("Cookie", admin)
      .send({ proyectoId, etapaId, tipoPago: "etapa", monto: 400 });
    const pagoId = solicitud.body.pago.id as string;

    const confirmacion = await request(app)
      .post(`/api/v1/pagos/${pagoId}/confirmar`)
      .set("Cookie", cookies);
    expect(confirmacion.status).toBe(403);

    await UserModel.create({
      email: "otro@correo.com",
      passwordHash: bcrypt.hashSync("Clave123", 12),
      nombre: "Otro",
      rol: "cliente",
    });
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "otro@correo.com",
      password: "Clave123",
    });
    const otrasCookies = login.headers["set-cookie"] as unknown as string[];
    const ajeno = await request(app)
      .get(`/api/v1/pagos/${pagoId}`)
      .set("Cookie", otrasCookies);
    expect(ajeno.status).toBe(404);
  });

  it("métodos de pago: público solo activos y CRUD solo admin", async () => {
    const admin = await crearAdmin();
    await crearMetodos();

    const publico = await request(app).get("/api/v1/metodos-pago");
    expect(publico.status).toBe(200);
    expect(publico.body.metodos.map((m: { clave: string }) => m.clave)).toEqual(
      ["nequi", "paypal"],
    );

    const crear = await request(app)
      .post("/api/v1/metodos-pago")
      .set("Cookie", admin)
      .send({ nombre: "DaviPlata", moneda: "COP", datos: "300 111 1111" });
    expect(crear.status).toBe(201);
    expect(crear.body.metodo.clave).toBe("daviplata");

    const sinAdmin = await request(app)
      .post("/api/v1/metodos-pago")
      .send({ nombre: "Otro" });
    expect(sinAdmin.status).toBe(401);
  });
});
