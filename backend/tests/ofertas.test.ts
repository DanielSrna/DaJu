import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { OfertaModel } from "../src/models/oferta.model";
import bcrypt from "bcryptjs";

async function loginAdmin(app: ReturnType<typeof createApp>) {
  const admin = await UserModel.create({
    email: "admin@mainplataform.com",
    passwordHash: bcrypt.hashSync("Admin123", 12),
    nombre: "Admin",
    rol: "admin" as const,
  });
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: admin.email, password: "Admin123" });
  return res.headers["set-cookie"] as unknown as string[];
}

describe("Ofertas API (plantillas y servicios)", () => {
  const app = createApp();
  let adminCookies: string[];

  beforeEach(async () => {
    await OfertaModel.deleteMany({});
    await UserModel.deleteMany({});
    adminCookies = await loginAdmin(app);
  });

  it("GET /ofertas público devuelve solo activas", async () => {
    await OfertaModel.create({
      tipo: "plantilla",
      nombre: "Plantilla Reservas",
      descripcion: "Web lista para reservas",
      features: ["Calendario"],
      desde: 550000,
      activo: true,
    });
    await OfertaModel.create({
      tipo: "consultoria",
      nombre: "Auditoría de código",
      descripcion: "Revisión experta",
      para: "Para quien ya tiene web",
      activo: false,
    });

    const res = await request(app).get("/api/v1/ofertas");
    expect(res.status).toBe(200);
    expect(res.body.ofertas).toHaveLength(1);
    expect(res.body.ofertas[0].nombre).toBe("Plantilla Reservas");
  });

  it("POST /ofertas sin sesión → 401", async () => {
    const res = await request(app).post("/api/v1/ofertas").send({
      tipo: "plantilla",
      nombre: "Nueva",
      descripcion: "Descripción mínima válida",
    });
    expect(res.status).toBe(401);
  });

  it("admin puede crear una plantilla (con validación)", async () => {
    const res = await request(app)
      .post("/api/v1/ofertas")
      .set("Cookie", adminCookies)
      .send({
        tipo: "plantilla",
        nombre: "Plantilla Cotizador",
        descripcion: "Formulario con cálculo de precios",
        features: ["Formulario", "Notificación"],
        desde: 500000,
        activo: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.oferta.nombre).toBe("Plantilla Cotizador");
  });

  it("admin puede actualizar y eliminar una oferta", async () => {
    const creada = await OfertaModel.create({
      tipo: "consultoria",
      nombre: "Asesoría técnica",
      descripcion: "Asesoría de arquitectura",
      para: "Startups",
      activo: true,
    });

    const upd = await request(app)
      .put(`/api/v1/ofertas/${creada._id}`)
      .set("Cookie", adminCookies)
      .send({ descripcion: "Asesoría de arquitectura actualizada", activo: false });
    expect(upd.status).toBe(200);
    expect(upd.body.oferta.activo).toBe(false);

    const del = await request(app)
      .delete(`/api/v1/ofertas/${creada._id}`)
      .set("Cookie", adminCookies);
    expect(del.status).toBe(204);

    const lista = await request(app).get("/api/v1/ofertas");
    expect(lista.body.ofertas).toHaveLength(0);
  });

  it("valida tipo y campos según tipo (plantilla requiere descripción + desde opcional)", async () => {
    const mal = await request(app)
      .post("/api/v1/ofertas")
      .set("Cookie", adminCookies)
      .send({ tipo: "otro", nombre: "X", descripcion: "Y" });
    expect(mal.status).toBe(400);

    const sinDesc = await request(app)
      .post("/api/v1/ofertas")
      .set("Cookie", adminCookies)
      .send({ tipo: "plantilla", nombre: "X" });
    expect(sinDesc.status).toBe(400);
  });
});
