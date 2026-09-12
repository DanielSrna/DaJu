import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { DocumentoModel } from "../src/models/documento.model";

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

const PDF = Buffer.from("%PDF-1.4\ncontenido de prueba\n%%EOF");

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
  return { cookies, proyectoId: cotizacion.body.entorno.id as string };
}

describe("Documentación del entorno (manuales PDF)", () => {
  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      PaqueteModel.deleteMany({}),
      ProyectoModel.deleteMany({}),
      DocumentoModel.deleteMany({}),
    ]);
  });

  it("el admin sube un PDF y el cliente dueño lo ve y lo descarga", async () => {
    const admin = await crearAdmin();
    const { cookies, proyectoId } = await clienteConProyecto();

    const subida = await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/documentos`)
      .set("Cookie", admin)
      .attach("archivo", PDF, "manual-admin.pdf")
      .field("titulo", "Manual del administrador")
      .field("descripcion", "Cómo gestionar proyectos y pagos");

    expect(subida.status).toBe(201);
    expect(subida.body.documento).toMatchObject({
      titulo: "Manual del administrador",
      descripcion: "Cómo gestionar proyectos y pagos",
    });
    expect(subida.body.documento.archivo.url).toBeTruthy();

    const listado = await request(app)
      .get(`/api/v1/proyectos/${proyectoId}/documentos`)
      .set("Cookie", cookies);
    expect(listado.status).toBe(200);
    expect(listado.body.documentos).toHaveLength(1);
    expect(listado.body.documentos[0].titulo).toBe("Manual del administrador");
  });

  it("rechaza archivos que no sean PDF y a clientes que intenten subir", async () => {
    const admin = await crearAdmin();
    const { cookies, proyectoId } = await clienteConProyecto();

    const noPdf = await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/documentos`)
      .set("Cookie", admin)
      .attach("archivo", Buffer.from("no soy pdf"), "manual.txt")
      .field("titulo", "Manual inválido");
    expect(noPdf.status).toBe(400);

    const cliente = await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/documentos`)
      .set("Cookie", cookies)
      .attach("archivo", PDF, "manual.pdf")
      .field("titulo", "Manual del cliente");
    expect(cliente.status).toBe(403);
  });

  it("otro cliente no ve la documentación ajena", async () => {
    const admin = await crearAdmin();
    const { proyectoId } = await clienteConProyecto();
    await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/documentos`)
      .set("Cookie", admin)
      .attach("archivo", PDF, "manual.pdf")
      .field("titulo", "Manual");

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
    const otras = login.headers["set-cookie"] as unknown as string[];

    const res = await request(app)
      .get(`/api/v1/proyectos/${proyectoId}/documentos`)
      .set("Cookie", otras);
    expect(res.status).toBe(403);
  });

  it("el admin elimina un manual", async () => {
    const admin = await crearAdmin();
    const { proyectoId } = await clienteConProyecto();

    const subida = await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/documentos`)
      .set("Cookie", admin)
      .attach("archivo", PDF, "manual.pdf")
      .field("titulo", "Manual temporal");

    const eliminado = await request(app)
      .delete(
        `/api/v1/proyectos/${proyectoId}/documentos/${subida.body.documento.id}`,
      )
      .set("Cookie", admin);
    expect(eliminado.status).toBe(204);
    expect(await DocumentoModel.countDocuments()).toBe(0);
  });
});
