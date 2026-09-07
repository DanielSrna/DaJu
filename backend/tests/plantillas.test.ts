import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PlantillaModel } from "../src/models/plantilla.model";
import bcrypt from "bcryptjs";

describe("Plantillas API", () => {
  const app = createApp();

  const plantillaValida = {
    nombre: "Plantilla Reservas",
    slug: "reservas",
    plataforma: "Reservas",
    descripcion: "Sistema de reservas listo para desplegar",
    precio: 299,
    moneda: "USD",
    vistasIncluidas: 5,
    soporteMeses: 3,
    diasEntrega: 20,
    features: ["Calendario", "Recordatorios"],
  };

  let adminCookies: string[];

  beforeEach(async () => {
    await PlantillaModel.deleteMany({});
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

  it("lista solo plantillas activas (las inactivas quedan fuera)", async () => {
    await PlantillaModel.create({ ...plantillaValida, activo: true });
    await PlantillaModel.create({
      ...plantillaValida,
      slug: "inventario",
      nombre: "Plantilla Inventario",
      plataforma: "Inventario",
      activo: false,
    });

    const res = await request(app).get("/api/v1/plantillas");

    expect(res.status).toBe(200);
    expect(res.body.plantillas).toHaveLength(1);
    expect(res.body.plantillas[0].slug).toBe("reservas");
  });

  it("obtiene detalle por slug y 404 si no existe o está inactiva", async () => {
    const creada = await PlantillaModel.create(plantillaValida);

    const ok = await request(app).get(`/api/v1/plantillas/${creada.slug}`);
    expect(ok.status).toBe(200);
    expect(ok.body.plantilla.nombre).toBe("Plantilla Reservas");
    expect(ok.body.plantilla.plataforma).toBe("Reservas");

    await request(app).get("/api/v1/plantillas/inexistente").expect(404);

    await PlantillaModel.create({
      ...plantillaValida,
      slug: "inactiva",
      activo: false,
    });
    await request(app).get("/api/v1/plantillas/inactiva").expect(404);
  });

  it("admin crea, lista todas, actualiza y elimina", async () => {
    const creada = await request(app)
      .post("/api/v1/plantillas")
      .set("Cookie", adminCookies)
      .send(plantillaValida);
    expect(creada.status).toBe(201);
    expect(creada.body.plantilla.id).toBeDefined();

    const id = creada.body.plantilla.id as string;

    const actualizada = await request(app)
      .put(`/api/v1/plantillas/${id}`)
      .set("Cookie", adminCookies)
      .send({ precio: 350 });
    expect(actualizada.status).toBe(200);
    expect(actualizada.body.plantilla.precio).toBe(350);

    const listado = await request(app)
      .get("/api/v1/plantillas/admin")
      .set("Cookie", adminCookies);
    expect(listado.status).toBe(200);
    expect(listado.body.plantillas).toHaveLength(1);

    await request(app)
      .delete(`/api/v1/plantillas/${id}`)
      .set("Cookie", adminCookies)
      .expect(204);
    await request(app).get("/api/v1/plantillas/reservas").expect(404);
  });

  it("rechaza slug duplicado al crear", async () => {
    await PlantillaModel.create(plantillaValida);
    const res = await request(app)
      .post("/api/v1/plantillas")
      .set("Cookie", adminCookies)
      .send(plantillaValida);
    expect(res.status).toBe(409);
  });

  it("bloquea CRUD sin autenticación", async () => {
    await request(app)
      .post("/api/v1/plantillas")
      .send(plantillaValida)
      .expect(401);
    await request(app).get("/api/v1/plantillas/admin").expect(401);
  });
});
