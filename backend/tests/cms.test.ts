import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { CmsConfigModel } from "../src/models/cms-config.model";
import { CarruselItemModel } from "../src/models/carrusel-item.model";
import bcrypt from "bcryptjs";

async function pngBuffer(): Promise<Buffer> {
  return sharp({
    create: { width: 30, height: 30, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .png()
    .toBuffer();
}

describe("Micro-CMS API", () => {
  const app = createApp();
  let adminCookies: string[];
  let clienteCookies: string[];

  beforeEach(async () => {
    await CmsConfigModel.deleteMany({});
    await CarruselItemModel.deleteMany({});
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

  describe("GET /api/v1/cms (público)", () => {
    it("devuelve la configuración por defecto sin autenticación", async () => {
      const res = await request(app).get("/api/v1/cms");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        logo: null,
        colores: { primario: "#000000", secundario: "#ffffff", acento: "#ffcc00" },
        marquesina: { texto: "", activo: false },
        carrusel: [],
      });
    });
  });

  describe("PUT /api/v1/cms/marquesina", () => {
    it("el admin activa la marquesina con texto", async () => {
      const res = await request(app)
        .put("/api/v1/cms/marquesina")
        .set("Cookie", adminCookies)
        .send({ texto: "¡Oferta! 20% en paquetes", activo: true });

      expect(res.status).toBe(200);
      expect(res.body.marquesina).toEqual({
        texto: "¡Oferta! 20% en paquetes",
        activo: true,
      });

      const publico = await request(app).get("/api/v1/cms");
      expect(publico.body.marquesina.activo).toBe(true);
    });

    it("el cliente no puede editar la marquesina (403)", async () => {
      const res = await request(app)
        .put("/api/v1/cms/marquesina")
        .set("Cookie", clienteCookies)
        .send({ texto: "hack", activo: true });

      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/v1/cms/identidad", () => {
    it("actualiza colores con JSON string en multipart", async () => {
      const res = await request(app)
        .put("/api/v1/cms/identidad")
        .set("Cookie", adminCookies)
        .field("colores", JSON.stringify({ primario: "#123456", acento: "#abcdef" }));

      expect(res.status).toBe(200);
      expect(res.body.colores).toMatchObject({ primario: "#123456", acento: "#abcdef" });
    });

    it("sube un logo PNG válido", async () => {
      const png = await pngBuffer();

      const res = await request(app)
        .put("/api/v1/cms/identidad")
        .set("Cookie", adminCookies)
        .attach("logo", png, { filename: "logo.png", contentType: "image/png" });

      expect(res.status).toBe(200);
      expect(res.body.logo).toMatchObject({ url: expect.stringContaining("fake-storage.test") });
      expect(res.body.logo.publicId).toBeDefined();
    });

    it("rechaza un archivo que no es imagen (400)", async () => {
      const exe = Buffer.from("MZ\x90\x00\x03\x00\x00\x00 no soy imagen");

      const res = await request(app)
        .put("/api/v1/cms/identidad")
        .set("Cookie", adminCookies)
        .attach("logo", exe, { filename: "logo.png", contentType: "image/png" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/cms/carrusel", () => {
    it("crea una imagen de carrusel activa", async () => {
      const png = await pngBuffer();

      const res = await request(app)
        .post("/api/v1/cms/carrusel")
        .set("Cookie", adminCookies)
        .field("link", "https://mainplataform.com/paquetes")
        .field("titulo", "Promoción lanzamiento")
        .field("orden", "1")
        .attach("imagen", png, { filename: "banner.png", contentType: "image/png" });

      expect(res.status).toBe(201);
      expect(res.body.item).toMatchObject({
        link: "https://mainplataform.com/paquetes",
        titulo: "Promoción lanzamiento",
        activo: true,
        orden: 1,
      });
    });

    it("la imagen inactiva no aparece en el CMS público", async () => {
      const png = await pngBuffer();
      await request(app)
        .post("/api/v1/cms/carrusel")
        .set("Cookie", adminCookies)
        .field("activo", "false")
        .attach("imagen", png, { filename: "oculto.png", contentType: "image/png" });

      const publico = await request(app).get("/api/v1/cms");
      expect(publico.body.carrusel).toHaveLength(0);
    });

    it("rechaza sin archivo (400)", async () => {
      const res = await request(app)
        .post("/api/v1/cms/carrusel")
        .set("Cookie", adminCookies);
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/v1/cms/carrusel/:id", () => {
    it("elimina la imagen del carrusel", async () => {
      const png = await pngBuffer();
      const creada = await request(app)
        .post("/api/v1/cms/carrusel")
        .set("Cookie", adminCookies)
        .attach("imagen", png, { filename: "b.png", contentType: "image/png" });

      const id = creada.body.item.id;
      const res = await request(app)
        .delete(`/api/v1/cms/carrusel/${id}`)
        .set("Cookie", adminCookies);

      expect(res.status).toBe(204);
      expect(await CarruselItemModel.findById(id)).toBeNull();
    });

    it("devuelve 404 si no existe", async () => {
      const res = await request(app)
        .delete("/api/v1/cms/carrusel/000000000000000000000000")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(404);
    });
  });
});
