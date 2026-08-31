import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { PagoModel } from "../src/models/pago.model";
import { addBusinessDays } from "../src/utils/fechas";
import bcrypt from "bcryptjs";

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

describe("Garantía API (soporte técnico post-entrega)", () => {
  const app = createApp();
  let adminCookies: string[];
  let clienteCookies: string[];
  let proyectoId: string;

  beforeEach(async () => {
    await ProyectoModel.deleteMany({});
    await PagoModel.deleteMany({});
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

    const paquete = await PaqueteModel.create(paqueteSeed);
    const pago = await PagoModel.create({
      paqueteId: paquete._id,
      paqueteSlug: paquete.slug,
      descripcion: "Pago",
      monto: 999,
      moneda: "USD",
      emailCliente: "cliente@mainplataform.com",
      clienteId: cliente._id,
      estado: "paid",
    });
    const proyecto = await ProyectoModel.create({
      clienteId: cliente._id,
      pagoId: pago._id,
      paquete: {
        slug: paquete.slug,
        nombre: paquete.nombre,
        tipo: paquete.tipo,
        vistasIncluidas: paquete.vistasIncluidas,
        soporteMeses: paquete.soporteMeses,
        diasEntrega: paquete.diasEntrega,
      },
      estado: "entregado",
      fechaCompra: new Date(),
      fechaEntrega: addBusinessDays(new Date(), 30),
      fechaEntregado: new Date(),
    });
    proyectoId = String(proyecto._id);
  });

  describe("GET /api/v1/proyectos/:id/garantia", () => {
    it("devuelve la garantía activa con fecha de expiración", async () => {
      const res = await request(app)
        .get(`/api/v1/proyectos/${proyectoId}/garantia`)
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(200);
      expect(res.body.garantia).toMatchObject({
        activa: true,
        soporteMeses: 12,
      });
      expect(res.body.garantia.fechaInicio).toBeDefined();
      expect(res.body.garantia.fechaExpiracion).toBeDefined();
      expect(res.body.garantia.diasRestantes).toBeGreaterThan(300);
    });

    it("el admin consulta la garantía de cualquier proyecto", async () => {
      const res = await request(app)
        .get(`/api/v1/proyectos/${proyectoId}/garantia`)
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
    });

    it("rechaza con 400 si el proyecto no fue entregado", async () => {
      await ProyectoModel.findByIdAndUpdate(proyectoId, {
        estado: "desarrollo",
        fechaEntregado: null,
      });

      const res = await request(app)
        .get(`/api/v1/proyectos/${proyectoId}/garantia`)
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rechaza con 404 si el proyecto no existe", async () => {
      const res = await request(app)
        .get("/api/v1/proyectos/000000000000000000000000/garantia")
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(404);
    });

    it("rechaza con 403 la garantía de un proyecto ajeno", async () => {
      const otro = await UserModel.create({
        email: "otro@correo.com",
        passwordHash: bcrypt.hashSync("Clave123", 12),
        nombre: "Otro",
        rol: "cliente",
      });
      const otroLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: otro.email, password: "Clave123" });
      const otroCookies = otroLogin.headers["set-cookie"] as unknown as string[];

      const res = await request(app)
        .get(`/api/v1/proyectos/${proyectoId}/garantia`)
        .set("Cookie", otroCookies);

      expect(res.status).toBe(403);
    });
  });
});
