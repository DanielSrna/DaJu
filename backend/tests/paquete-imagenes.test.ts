import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
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

describe("Paquetes — imágenes y detalles", () => {
  const app = createApp();
  let adminCookies: string[];
  let clienteCookies: string[];
  let paqueteId: string;

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

    const paquete = await PaqueteModel.create(paqueteSeed);
    paqueteId = String(paquete._id);
  });

  describe("POST /api/v1/paquetes/:id/imagen (portada)", () => {
    it("sube la imagen de portada", async () => {
      const png = await sharp({
        create: { width: 40, height: 40, channels: 3, background: { r: 1, g: 2, b: 3 } },
      })
        .png()
        .toBuffer();

      const res = await request(app)
        .post(`/api/v1/paquetes/${paqueteId}/imagen`)
        .set("Cookie", adminCookies)
        .attach("imagen", png, { filename: "portada.png", contentType: "image/png" });

      expect(res.status).toBe(200);
      expect(res.body.paquete.imagen).toMatchObject({
        url: expect.stringContaining("fake-storage.test"),
      });
    });

    it("rechaza un PDF como portada (400)", async () => {
      const pdf = Buffer.from("%PDF-1.4 no soy imagen");

      const res = await request(app)
        .post(`/api/v1/paquetes/${paqueteId}/imagen`)
        .set("Cookie", adminCookies)
        .attach("imagen", pdf, { filename: "portada.pdf", contentType: "application/pdf" });

      expect(res.status).toBe(400);
    });

    it("el cliente no puede subir portadas (403)", async () => {
      const png = await sharp({
        create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
      })
        .png()
        .toBuffer();

      const res = await request(app)
        .post(`/api/v1/paquetes/${paqueteId}/imagen`)
        .set("Cookie", clienteCookies)
        .attach("imagen", png, { filename: "x.png", contentType: "image/png" });

      expect(res.status).toBe(403);
    });
  });

  describe("POST/DELETE /api/v1/paquetes/:id/galeria", () => {
    it("añade imágenes a la galería y las elimina", async () => {
      const png = await sharp({
        create: { width: 20, height: 20, channels: 3, background: { r: 10, g: 20, b: 30 } },
      })
        .png()
        .toBuffer();

      const creada = await request(app)
        .post(`/api/v1/paquetes/${paqueteId}/galeria`)
        .set("Cookie", adminCookies)
        .attach("imagen", png, { filename: "vista1.png", contentType: "image/png" });

      expect(creada.status).toBe(201);
      expect(creada.body.paquete.galeria).toHaveLength(1);

      const publicId = creada.body.paquete.galeria[0].publicId;

      const eliminada = await request(app)
        .delete(`/api/v1/paquetes/${paqueteId}/galeria/${publicId}`)
        .set("Cookie", adminCookies);

      expect(eliminada.status).toBe(200);
      expect(eliminada.body.paquete.galeria).toHaveLength(0);
    });

    it("devuelve 404 al eliminar una imagen que no está en la galería", async () => {
      const res = await request(app)
        .delete(`/api/v1/paquetes/${paqueteId}/galeria/no-existe`)
        .set("Cookie", adminCookies);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/v1/paquetes/:id con detalles", () => {
    it("guarda secciones descriptivas del producto", async () => {
      const res = await request(app)
        .put(`/api/v1/paquetes/${paqueteId}`)
        .set("Cookie", adminCookies)
        .send({
          detalles: [
            { titulo: "¿Qué incluye?", texto: "Mini-dashboard CRUD con métricas" },
            { titulo: "Soporte", texto: "1 año de soporte técnico" },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.paquete.detalles).toHaveLength(2);
      expect(res.body.paquete.detalles[0]).toMatchObject({
        titulo: "¿Qué incluye?",
        texto: "Mini-dashboard CRUD con métricas",
      });
    });

    it("rechaza detalles con texto muy largo (400)", async () => {
      const res = await request(app)
        .put(`/api/v1/paquetes/${paqueteId}`)
        .set("Cookie", adminCookies)
        .send({ detalles: [{ titulo: "X", texto: "a".repeat(2500) }] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
