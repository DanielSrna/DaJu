import request from "supertest";
import { createApp } from "../src/app";
import { ContactoModel } from "../src/models/contacto.model";
import { UserModel } from "../src/models/user.model";
import { FakeEmailProvider } from "../src/adapters/email/fake/fake-email.provider";
import { ContactoService } from "../src/services/contacto.service";
import { env } from "../src/config/env";
import bcrypt from "bcryptjs";

describe("Contacto API", () => {
  const app = createApp();
  let adminCookies: string[];

  beforeEach(async () => {
    await ContactoModel.deleteMany({});
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

  describe("POST /api/v1/contacto", () => {
    it("guarda el mensaje y devuelve confirmación", async () => {
      const res = await request(app).post("/api/v1/contacto").send({
        nombre: "Juan Pérez",
        email: "juan@correo.com",
        asunto: "Cotización",
        mensaje: "Me interesa el paquete operativo, ¿tienen disponibilidad?",
      });

      expect(res.status).toBe(201);
      expect(res.body.mensaje).toMatchObject({
        nombre: "Juan Pérez",
        email: "juan@correo.com",
        asunto: "Cotización",
      });

      const guardado = await ContactoModel.findById(res.body.mensaje.id);
      expect(guardado).not.toBeNull();
      expect(guardado!.mensaje).toContain("paquete operativo");
    });

    it("rechaza el honeypot activado (bot) sin guardar", async () => {
      const res = await request(app).post("/api/v1/contacto").send({
        nombre: "Bot",
        email: "bot@correo.com",
        mensaje: "Mensaje spam de prueba largo",
        _website: "http://spam.com",
      });

      expect(res.status).toBe(400);
      expect(await ContactoModel.countDocuments({})).toBe(0);
    });

    it("rechaza mensaje corto con 400 VALIDATION_ERROR", async () => {
      const res = await request(app).post("/api/v1/contacto").send({
        nombre: "Juan",
        email: "juan@correo.com",
        mensaje: "corto",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rechaza email inválido", async () => {
      const res = await request(app).post("/api/v1/contacto").send({
        nombre: "Juan",
        email: "no-email",
        mensaje: "Mensaje de prueba con longitud suficiente",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("ContactoService (envío de correos con fake provider)", () => {
    it("envía al admin y acuse al usuario", async () => {
      const fakeEmail = new FakeEmailProvider();
      const servicio = new ContactoService(fakeEmail);

      await servicio.enviar({
        nombre: "María",
        email: "maria@correo.com",
        asunto: "Soporte",
        mensaje: "Necesito ayuda con mi proyecto",
      });

      expect(fakeEmail.enviados).toHaveLength(2);
      expect(fakeEmail.enviados[0].to).toBe(env.CONTACT_EMAIL);
      expect(fakeEmail.enviados[0].subject).toContain("[Contacto]");
      expect(fakeEmail.enviados[1].to).toBe("maria@correo.com");
      expect(fakeEmail.enviados[1].subject).toContain("Recibimos tu mensaje");
    });

    it("escapa HTML del mensaje (anti-XSS en el correo)", async () => {
      const fakeEmail = new FakeEmailProvider();
      const servicio = new ContactoService(fakeEmail);

      await servicio.enviar({
        nombre: "<script>alert(1)</script>",
        email: "xss@correo.com",
        mensaje: "Hola <b>negrita</b> & amigos",
      });

      expect(fakeEmail.enviados[0].html).not.toContain("<script>");
      expect(fakeEmail.enviados[0].html).toContain("&lt;script&gt;");
      expect(fakeEmail.enviados[0].html).toContain("&amp;");
    });
  });

  describe("GET /api/v1/contacto/mensajes (admin)", () => {
    it("lista los mensajes paginados", async () => {
      for (let i = 0; i < 3; i++) {
        await ContactoModel.create({
          nombre: `Cliente ${i}`,
          email: `cliente${i}@correo.com`,
          mensaje: `Mensaje de prueba número ${i}`,
        });
      }

      const res = await request(app)
        .get("/api/v1/contacto/mensajes?pagina=1&limite=2")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.mensajes).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.totalPaginas).toBe(2);
    });

    it("el cliente no puede ver los mensajes (403)", async () => {
      const cliente = await UserModel.create({
        email: "cliente@mainplataform.com",
        passwordHash: bcrypt.hashSync("Cliente123", 12),
        nombre: "Cliente",
        rol: "cliente",
      });
      const loginCliente = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: cliente.email, password: "Cliente123" });
      const clienteCookies = loginCliente.headers["set-cookie"] as unknown as string[];

      const res = await request(app)
        .get("/api/v1/contacto/mensajes")
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(403);
    });
  });
});
