import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { PagoModel } from "../src/models/pago.model";

const app = createApp();

const paqueteSeed = {
  nombre: "Paquete Validor",
  slug: "validor",
  tipo: "validor" as const,
  descripcion: "Landing de una vista",
  precio: 199,
  moneda: "USD",
  vistasIncluidas: 1,
  soporteMeses: 2,
  diasEntrega: 15,
};

const datosCotizacion = {
  tipoProducto: "paquete",
  nombre: "Ana",
  segundoNombre: "María",
  primerApellido: "Pérez",
  segundoApellido: "Gómez",
  fechaNacimiento: "1995-04-12",
  aceptaCondiciones: true,
  aceptaDatos: true,
  email: "ana@correo.com",
  password: "Clave123",
};

describe("Cotización y verificación de email", () => {
  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      PaqueteModel.deleteMany({}),
      ProyectoModel.deleteMany({}),
      PagoModel.deleteMany({}),
    ]);
  });

  async function crearPaquete() {
    return PaqueteModel.create(paqueteSeed);
  }

  it("registra la cuenta y abre el proyecto en planeación con la etapa gratis", async () => {
    const paquete = await crearPaquete();
    const res = await request(app)
      .post("/api/v1/cotizaciones")
      .send({ ...datosCotizacion, paqueteId: String(paquete._id) });

    expect(res.status).toBe(201);
    expect(res.body.entorno).toMatchObject({
      tipo: "proyecto",
      tipoProducto: "paquete",
      productoSlug: "validor",
      estado: "planeacion",
    });
    expect(res.body.usuario.emailVerificado).toBe(false);
    expect(res.body.nuevo).toBe(true);

    const proyecto = await ProyectoModel.findById(res.body.entorno.id);
    expect(proyecto).not.toBeNull();
    expect(proyecto!.estado).toBe("planeacion");
    expect(proyecto!.fechaCompra).toBeNull();
    expect(proyecto!.fechaEntrega).toBeNull();
    expect(proyecto!.precioBase).toBe(199);
    expect(proyecto!.etapas).toHaveLength(1);
    expect(proyecto!.etapas[0].nombre).toBe("Planeación y diseño — Gratis");
    expect(proyecto!.etapas[0].requierePago).toBe(false);
    expect(proyecto!.etapas[0].estado).toBe("en_curso");
    expect(await PagoModel.countDocuments()).toBe(0);

    // Identidad completa y contratos aceptados con su versión.
    const usuario = await UserModel.findOne({ email: datosCotizacion.email });
    expect(usuario!.nombre).toBe("Ana María Pérez Gómez");
    expect(usuario!.primerApellido).toBe("Pérez");
    expect(usuario!.fechaNacimiento).not.toBeNull();
    expect(usuario!.aceptaCondiciones?.version).toBe("1.0");
    expect(usuario!.aceptaDatos?.version).toBe("1.0");
    expect(usuario!.aceptaDatos?.fecha).toBeInstanceOf(Date);
  });

  it("404 si el producto no está activo", async () => {
    const paquete = await PaqueteModel.create({
      ...paqueteSeed,
      slug: "inactivo",
      activo: false,
    });
    const res = await request(app)
      .post("/api/v1/cotizaciones")
      .send({ ...datosCotizacion, paqueteId: String(paquete._id) });

    expect(res.status).toBe(404);
    expect(await ProyectoModel.countDocuments()).toBe(0);
  });

  it("401 si la cuenta existe y la contraseña no coincide", async () => {
    const paquete = await crearPaquete();
    await UserModel.create({
      email: datosCotizacion.email,
      passwordHash: bcrypt.hashSync("OtraClave1", 12),
      nombre: "Ana",
      rol: "cliente",
    });
    const res = await request(app)
      .post("/api/v1/cotizaciones")
      .send({ ...datosCotizacion, paqueteId: String(paquete._id) });

    expect(res.status).toBe(401);
    expect(await ProyectoModel.countDocuments()).toBe(0);
  });

  it("reutiliza el entorno vigente del mismo producto", async () => {
    const paquete = await crearPaquete();
    const primera = await request(app)
      .post("/api/v1/cotizaciones")
      .send({ ...datosCotizacion, paqueteId: String(paquete._id) });
    const cookies = primera.headers["set-cookie"] as unknown as string[];

    const segunda = await request(app)
      .post("/api/v1/cotizaciones")
      .set("Cookie", cookies)
      .send({ ...datosCotizacion, paqueteId: String(paquete._id) });

    expect(segunda.status).toBe(201);
    expect(segunda.body.entorno.id).toBe(primera.body.entorno.id);
    expect(segunda.body.nuevo).toBe(false);
    expect(await ProyectoModel.countDocuments()).toBe(1);
  });

  it("bloquea el portal hasta verificar el correo y lo habilita con el token", async () => {
    const paquete = await crearPaquete();
    const res = await request(app)
      .post("/api/v1/cotizaciones")
      .send({ ...datosCotizacion, paqueteId: String(paquete._id) });
    const cookies = res.headers["set-cookie"] as unknown as string[];

    const bloqueado = await request(app)
      .get("/api/v1/proyectos")
      .set("Cookie", cookies);
    expect(bloqueado.status).toBe(403);
    expect(bloqueado.body.error.code).toBe("EMAIL_NO_VERIFICADO");

    const usuario = await UserModel.findOne({
      email: datosCotizacion.email,
    }).select("+emailVerificacionToken");
    expect(usuario!.emailVerificacionToken).toBeTruthy();

    const verificacion = await request(app)
      .post("/api/v1/auth/verificar-email")
      .send({ token: usuario!.emailVerificacionToken });
    expect(verificacion.status).toBe(200);

    const permitido = await request(app)
      .get("/api/v1/proyectos")
      .set("Cookie", cookies);
    expect(permitido.status).toBe(200);
  });

  it("400 si el token de verificación es inválido", async () => {
    const res = await request(app)
      .post("/api/v1/auth/verificar-email")
      .send({ token: "token-que-no-existe" });
    expect(res.status).toBe(400);
  });

  it("rechaza el registro de menores de edad", async () => {
    const paquete = await crearPaquete();
    const res = await request(app)
      .post("/api/v1/cotizaciones")
      .send({
        ...datosCotizacion,
        paqueteId: String(paquete._id),
        fechaNacimiento: "2015-01-01",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/mayor de edad/i);
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it("exige aceptar los dos contratos para registrarse", async () => {
    const paquete = await crearPaquete();
    const res = await request(app)
      .post("/api/v1/cotizaciones")
      .send({
        ...datosCotizacion,
        paqueteId: String(paquete._id),
        aceptaDatos: false,
      });
    expect(res.status).toBe(400);
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it("el admin puede verificar manualmente una cuenta", async () => {
    const paquete = await crearPaquete();
    const res = await request(app)
      .post("/api/v1/cotizaciones")
      .send({ ...datosCotizacion, paqueteId: String(paquete._id) });

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
    const adminCookies = login.headers["set-cookie"] as unknown as string[];

    const verificacion = await request(app)
      .post(`/api/v1/auth/usuarios/${res.body.usuario.id}/verificar`)
      .set("Cookie", adminCookies);
    expect(verificacion.status).toBe(200);
    expect(verificacion.body.user.emailVerificado).toBe(true);
  });

  it("un cliente verificado adquiere otro producto sin registrarse de nuevo", async () => {
    const paquete = await crearPaquete();
    const primera = await request(app)
      .post("/api/v1/cotizaciones")
      .send({ ...datosCotizacion, paqueteId: String(paquete._id) });
    const cookies = primera.headers["set-cookie"] as unknown as string[];
    const usuario = await UserModel.findOne({
      email: datosCotizacion.email,
    }).select("+emailVerificacionToken");
    await request(app)
      .post("/api/v1/auth/verificar-email")
      .send({ token: usuario!.emailVerificacionToken });

    const segundo = await PaqueteModel.create({
      ...paqueteSeed,
      nombre: "Paquete Corporativo",
      slug: "corporativo",
      tipo: "corporativo",
    });
    const res = await request(app)
      .post("/api/v1/cotizaciones/cliente")
      .set("Cookie", cookies)
      .send({ tipoProducto: "paquete", paqueteId: String(segundo._id) });

    expect(res.status).toBe(201);
    expect(res.body.nuevo).toBe(false);
    expect(res.body.entorno.estado).toBe("planeacion");
    expect(
      await ProyectoModel.countDocuments({ clienteId: usuario!._id }),
    ).toBe(2);
  });

  it("sin el correo verificado no se puede adquirir otro producto", async () => {
    const paquete = await crearPaquete();
    const primera = await request(app)
      .post("/api/v1/cotizaciones")
      .send({ ...datosCotizacion, paqueteId: String(paquete._id) });
    const cookies = primera.headers["set-cookie"] as unknown as string[];

    const res = await request(app)
      .post("/api/v1/cotizaciones/cliente")
      .set("Cookie", cookies)
      .send({ tipoProducto: "paquete", paqueteId: String(paquete._id) });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("EMAIL_NO_VERIFICADO");
  });
});
