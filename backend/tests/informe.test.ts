import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { InformeModel } from "../src/models/informe.model";

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

describe("Informe técnico del entorno", () => {
  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      PaqueteModel.deleteMany({}),
      ProyectoModel.deleteMany({}),
      InformeModel.deleteMany({}),
    ]);
  });

  it("el cliente ve el resumen con las pruebas base y sin el detalle", async () => {
    const { cookies, proyectoId } = await clienteConProyecto();

    const res = await request(app)
      .get(`/api/v1/proyectos/${proyectoId}/informe`)
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.informe.vistas).toBe(0);
    expect(res.body.informe.funciones).toBe(0);
    expect(res.body.informe.costoTotal).toBe(0);
    expect(res.body.informe.rendimiento).toEqual({
      total: 3,
      promedio: null,
    });
    expect(res.body.informe.seguridad).toEqual({
      total: 2,
      promedio: null,
    });
    expect(res.body.informe.tests).toEqual({ total: 0, aprobados: 0 });
    // El detalle solo va en el PDF.
    expect(res.body.informe.pruebas).toBeUndefined();
  });

  it("el admin ve el detalle y puede calificar, agregar y borrar", async () => {
    const admin = await crearAdmin();
    const { proyectoId } = await clienteConProyecto();

    const inicial = await request(app)
      .get(`/api/v1/proyectos/${proyectoId}/informe`)
      .set("Cookie", admin);
    expect(inicial.body.informe.pruebas).toHaveLength(5);
    const carga = inicial.body.informe.pruebas.find(
      (p: { titulo: string }) => p.titulo.includes("carga"),
    );

    const calificada = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/informe/pruebas/${carga.id}`)
      .set("Cookie", admin)
      .send({ calificacion: 92 });
    expect(calificada.status).toBe(200);

    const agregada = await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/informe/pruebas`)
      .set("Cookie", admin)
      .send({
        tipo: "rendimiento",
        titulo: "Prueba de concurrencia",
        descripcion: "500 usuarios simultáneos",
        calificacion: 80,
      });
    expect(agregada.status).toBe(201);
    expect(agregada.body.pruebas).toHaveLength(6);

    const test = await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/informe/pruebas`)
      .set("Cookie", admin)
      .send({
        tipo: "test",
        titulo: "Login de clientes",
        descripcion: "Credenciales válidas e inválidas",
        exitoso: true,
      });
    expect(test.status).toBe(201);

    const resumen = await request(app)
      .get(`/api/v1/proyectos/${proyectoId}/informe`)
      .set("Cookie", admin);
    expect(resumen.body.informe.rendimiento.total).toBe(4);
    expect(resumen.body.informe.rendimiento.promedio).toBe(86);
    expect(resumen.body.informe.tests).toEqual({ total: 1, aprobados: 1 });

    const eliminada = await request(app)
      .delete(
        `/api/v1/proyectos/${proyectoId}/informe/pruebas/${
          agregada.body.pruebas.find(
            (p: { titulo: string }) => p.titulo === "Prueba de concurrencia",
          ).id
        }`,
      )
      .set("Cookie", admin);
    expect(eliminada.status).toBe(200);
    // Quedan las 5 base + el test agregado.
    expect(eliminada.body.pruebas).toHaveLength(6);
  });

  it("guarda el impacto calculado y lo refleja en el resumen", async () => {
    const admin = await crearAdmin();
    const { proyectoId } = await clienteConProyecto();

    const res = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/informe/impacto`)
      .set("Cookie", admin)
      .send({ porcentaje: 35, descripcion: "Menos tareas manuales" });
    expect(res.status).toBe(200);
    expect(res.body.impacto).toEqual({
      porcentaje: 35,
      descripcion: "Menos tareas manuales",
    });

    const resumen = await request(app)
      .get(`/api/v1/proyectos/${proyectoId}/informe`)
      .set("Cookie", admin);
    expect(resumen.body.informe.impacto.porcentaje).toBe(35);
  });

  it("descarga el PDF con el detalle para el cliente", async () => {
    const admin = await crearAdmin();
    const { cookies, proyectoId } = await clienteConProyecto();

    await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/informe/pruebas`)
      .set("Cookie", admin)
      .send({
        tipo: "test",
        titulo: "Prueba de humo",
        exitoso: true,
      });

    const res = await request(app)
      .get(`/api/v1/proyectos/${proyectoId}/informe/pdf`)
      .set("Cookie", cookies)
      .buffer(true)
      .parse((respuesta, callback) => {
        const partes: Buffer[] = [];
        respuesta.on("data", (parte: Buffer) => partes.push(parte));
        respuesta.on("end", () => callback(null, Buffer.concat(partes)));
      });

    expect(res.status).toBe(200);
    expect(String(res.headers["content-type"])).toContain("application/pdf");
    expect(String(res.headers["content-disposition"])).toContain(".pdf");
    const cuerpo = res.body as Buffer;
    expect(cuerpo.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("otro cliente no puede ver el informe ajeno", async () => {
    const { proyectoId } = await clienteConProyecto();
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
      .get(`/api/v1/proyectos/${proyectoId}/informe`)
      .set("Cookie", otras);
    expect(res.status).toBe(403);
  });
});
