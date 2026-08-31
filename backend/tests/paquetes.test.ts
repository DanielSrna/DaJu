import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import bcrypt from "bcryptjs";

describe("Paquetes API", () => {
  const app = createApp();

  const paqueteValido = {
    nombre: "Paquete Validor",
    slug: "validor",
    tipo: "validor",
    descripcion: "Landing page de una vista con 2 meses de soporte",
    precio: 199,
    moneda: "USD",
    vistasIncluidas: 1,
    soporteMeses: 2,
    diasEntrega: 10,
    features: ["1 vista estática", "2 meses de soporte"],
  };

  let adminCookies: string[];
  let clienteCookies: string[];

  beforeEach(async () => {
    await PaqueteModel.deleteMany({});
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

    const cliente = await UserModel.create({
      email: "cliente@mainplataform.com",
      passwordHash: bcrypt.hashSync("Cliente123", 12),
      nombre: "Cliente",
      rol: "cliente",
    });
    const loginCliente = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: cliente.email, password: "Cliente123" });
    clienteCookies = loginCliente.headers["set-cookie"] as unknown as string[];
  });

  describe("GET /api/v1/paquetes (público)", () => {
    it("devuelve solo paquetes activos ordenados por precio", async () => {
      await PaqueteModel.create(paqueteValido);
      await PaqueteModel.create({
        ...paqueteValido,
        nombre: "Paquete Inactivo",
        slug: "inactivo",
        precio: 50,
        activo: false,
      });

      const res = await request(app).get("/api/v1/paquetes");

      expect(res.status).toBe(200);
      expect(res.body.paquetes).toHaveLength(1);
      expect(res.body.paquetes[0].slug).toBe("validor");
      expect(res.body.paquetes[0]).not.toHaveProperty("passwordHash");
    });

    it("no requiere autenticación", async () => {
      const res = await request(app).get("/api/v1/paquetes");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/v1/paquetes/:slug (público)", () => {
    it("devuelve el paquete por slug", async () => {
      await PaqueteModel.create(paqueteValido);

      const res = await request(app).get("/api/v1/paquetes/validor");

      expect(res.status).toBe(200);
      expect(res.body.paquete).toMatchObject({
        slug: "validor",
        nombre: "Paquete Validor",
        precio: 199,
      });
    });

    it("devuelve 404 si el slug no existe", async () => {
      const res = await request(app).get("/api/v1/paquetes/no-existe");
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("devuelve 404 si el paquete está inactivo", async () => {
      await PaqueteModel.create({ ...paqueteValido, activo: false });

      const res = await request(app).get("/api/v1/paquetes/validor");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/paquetes (admin)", () => {
    it("crea un paquete como admin", async () => {
      const res = await request(app)
        .post("/api/v1/paquetes")
        .set("Cookie", adminCookies)
        .send(paqueteValido);

      expect(res.status).toBe(201);
      expect(res.body.paquete).toMatchObject({
        slug: "validor",
        tipo: "validor",
        activo: true,
      });
    });

    it("rechaza slug duplicado con 409", async () => {
      await PaqueteModel.create(paqueteValido);

      const res = await request(app)
        .post("/api/v1/paquetes")
        .set("Cookie", adminCookies)
        .send(paqueteValido);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("rechaza con 403 si el usuario es cliente", async () => {
      const res = await request(app)
        .post("/api/v1/paquetes")
        .set("Cookie", clienteCookies)
        .send(paqueteValido);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rechaza con 401 sin autenticación", async () => {
      const res = await request(app).post("/api/v1/paquetes").send(paqueteValido);
      expect(res.status).toBe(401);
    });

    it("valida el tipo del paquete con 400", async () => {
      const res = await request(app)
        .post("/api/v1/paquetes")
        .set("Cookie", adminCookies)
        .send({ ...paqueteValido, tipo: "gold" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("PUT /api/v1/paquetes/:id (admin)", () => {
    it("actualiza el precio de un paquete", async () => {
      const created = await PaqueteModel.create(paqueteValido);

      const res = await request(app)
        .put(`/api/v1/paquetes/${created._id}`)
        .set("Cookie", adminCookies)
        .send({ precio: 249 });

      expect(res.status).toBe(200);
      expect(res.body.paquete.precio).toBe(249);
    });

    it("devuelve 404 si el id no existe", async () => {
      const res = await request(app)
        .put("/api/v1/paquetes/000000000000000000000000")
        .set("Cookie", adminCookies)
        .send({ precio: 249 });

      expect(res.status).toBe(404);
    });

    it("rechaza con 400 id mal formado", async () => {
      const res = await request(app)
        .put("/api/v1/paquetes/no-es-un-id")
        .set("Cookie", adminCookies)
        .send({ precio: 249 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("DELETE /api/v1/paquetes/:id (admin)", () => {
    it("elimina un paquete", async () => {
      const created = await PaqueteModel.create(paqueteValido);

      const res = await request(app)
        .delete(`/api/v1/paquetes/${created._id}`)
        .set("Cookie", adminCookies);

      expect(res.status).toBe(204);
      expect(await PaqueteModel.findById(created._id)).toBeNull();
    });

    it("rechaza con 403 si el usuario es cliente", async () => {
      const created = await PaqueteModel.create(paqueteValido);

      const res = await request(app)
        .delete(`/api/v1/paquetes/${created._id}`)
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/paquetes/admin", () => {
    it("devuelve todos los paquetes incluyendo inactivos como admin", async () => {
      await PaqueteModel.create(paqueteValido);
      await PaqueteModel.create({ ...paqueteValido, slug: "inactivo", activo: false });

      const res = await request(app)
        .get("/api/v1/paquetes/admin")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.paquetes).toHaveLength(2);
    });

    it("rechaza con 403 si el usuario es cliente", async () => {
      const res = await request(app)
        .get("/api/v1/paquetes/admin")
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(403);
    });
  });
});
