import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { ServicioModel } from "../src/models/servicio.model";
import bcrypt from "bcryptjs";

describe("Servicios API", () => {
  const app = createApp();

  const servicioValido = {
    nombre: "Auditoría de código",
    slug: "auditoria-codigo",
    categoria: "auditoria",
    descripcion: "Revisión profunda de tu código y tu arquitectura",
    precio: 120,
    moneda: "USD",
    duracionMin: 60,
    canal: "Meet",
    incluye: ["Análisis de arquitectura", "Informe de hallazgos"],
  };

  let adminCookies: string[];

  beforeEach(async () => {
    await ServicioModel.deleteMany({});
    await UserModel.deleteMany({});

    const admin = await UserModel.create({
      email: "admin@mainplataform.com",
      passwordHash: bcrypt.hashSync("Admin123", 12),
      nombre: "Admin",
      rol: "admin",
    });
    const loginAdmin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: admin.email, password: "Admin123" });
    adminCookies = loginAdmin.headers["set-cookie"] as unknown as string[];
  });

  it("lista solo servicios activos", async () => {
    await ServicioModel.create({ ...servicioValido, activo: true });
    await ServicioModel.create({
      ...servicioValido,
      slug: "asesoria",
      nombre: "Asesoría 1:1",
      categoria: "asesoria",
      activo: false,
    });

    const res = await request(app).get("/api/v1/servicios");

    expect(res.status).toBe(200);
    expect(res.body.servicios).toHaveLength(1);
    expect(res.body.servicios[0].slug).toBe("auditoria-codigo");
  });

  it("obtiene detalle por slug y 404 si no existe", async () => {
    const creado = await ServicioModel.create(servicioValido);

    const ok = await request(app).get(`/api/v1/servicios/${creado.slug}`);
    expect(ok.status).toBe(200);
    expect(ok.body.servicio.nombre).toBe("Auditoría de código");
    expect(ok.body.servicio.precio).toBe(120);

    await request(app).get("/api/v1/servicios/inexistente").expect(404);
  });

  it("admin crea, actualiza y elimina servicios con validación por categoría", async () => {
    const creado = await request(app)
      .post("/api/v1/servicios")
      .set("Cookie", adminCookies)
      .send(servicioValido);
    expect(creado.status).toBe(201);

    const id = creado.body.servicio.id as string;

    const invalido = await request(app)
      .post("/api/v1/servicios")
      .set("Cookie", adminCookies)
      .send({ ...servicioValido, slug: "otro", categoria: "no-existe" });
    expect(invalido.status).toBe(400);

    const actualizado = await request(app)
      .put(`/api/v1/servicios/${id}`)
      .set("Cookie", adminCookies)
      .send({ precio: 140, canal: "Zoom" });
    expect(actualizado.status).toBe(200);
    expect(actualizado.body.servicio.precio).toBe(140);
    expect(actualizado.body.servicio.canal).toBe("Zoom");

    await request(app)
      .delete(`/api/v1/servicios/${id}`)
      .set("Cookie", adminCookies)
      .expect(204);
    await request(app).get("/api/v1/servicios/auditoria-codigo").expect(404);
  });

  it("bloquea CRUD sin autenticación", async () => {
    await request(app)
      .post("/api/v1/servicios")
      .send(servicioValido)
      .expect(401);
    await request(app).get("/api/v1/servicios/admin").expect(401);
  });
});
