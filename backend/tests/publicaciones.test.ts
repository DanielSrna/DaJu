import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PublicacionModel } from "../src/models/publicacion.model";
import bcrypt from "bcryptjs";

const basePub = {
  titulo: "¿Qué es una landing page?",
  tipo: "concepto" as const,
  resumen: "La pieza que convierte visitas en clientes",
  contenido:
    "Una landing page es una página enfocada en una sola acción. Por eso importa: concentra la atención del visitante.",
  secciones: ["faq"],
  publicado: true,
};

describe("Blog (publicaciones)", () => {
  const app = createApp();
  let adminCookies: string[];
  let clienteCookies: string[];

  beforeEach(async () => {
    await PublicacionModel.deleteMany({});
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

  describe("GET /api/v1/publicaciones (público)", () => {
    it("solo devuelve publicaciones publicadas", async () => {
      await PublicacionModel.create({ ...basePub, slug: "landing-1" });
      await PublicacionModel.create({
        ...basePub,
        titulo: "Borrador secreto",
        slug: "borrador-1",
        publicado: false,
      });

      const res = await request(app).get("/api/v1/publicaciones");

      expect(res.status).toBe(200);
      expect(res.body.publicaciones).toHaveLength(1);
      expect(res.body.publicaciones[0].slug).toBe("landing-1");
    });

    it("filtra por sección asociada (faq)", async () => {
      await PublicacionModel.create({ ...basePub, slug: "para-faq" });
      await PublicacionModel.create({
        ...basePub,
        titulo: "Otro",
        slug: "para-postventa",
        secciones: ["postventa"],
      });

      const res = await request(app).get("/api/v1/publicaciones?seccion=faq");

      expect(res.status).toBe(200);
      expect(res.body.publicaciones).toHaveLength(1);
      expect(res.body.publicaciones[0].slug).toBe("para-faq");
    });

    it("filtra por tipo noticia", async () => {
      await PublicacionModel.create({ ...basePub, slug: "concepto-1" });
      await PublicacionModel.create({
        ...basePub,
        titulo: "Nueva pasarela",
        slug: "noticia-1",
        tipo: "noticia",
        secciones: [],
      });

      const res = await request(app).get("/api/v1/publicaciones?tipo=noticia");

      expect(res.body.publicaciones).toHaveLength(1);
      expect(res.body.publicaciones[0].tipo).toBe("noticia");
    });

    it("las respuestas no exponen fechas ni campos internos", async () => {
      await PublicacionModel.create({ ...basePub, slug: "landing-2" });

      const res = await request(app).get("/api/v1/publicaciones");
      const pub = res.body.publicaciones[0];

      expect(pub).not.toHaveProperty("createdAt");
      expect(pub).not.toHaveProperty("updatedAt");
      expect(pub).not.toHaveProperty("publicado");
      expect(pub).not.toHaveProperty("_id");
    });
  });

  describe("GET /api/v1/publicaciones/:slug", () => {
    it("devuelve una publicación pública", async () => {
      await PublicacionModel.create({ ...basePub, slug: "landing-page" });

      const res = await request(app).get("/api/v1/publicaciones/landing-page");

      expect(res.status).toBe(200);
      expect(res.body.publicacion.titulo).toBe("¿Qué es una landing page?");
    });

    it("no devuelve borradores (404)", async () => {
      await PublicacionModel.create({
        ...basePub,
        slug: "borrador-2",
        publicado: false,
      });

      const res = await request(app).get("/api/v1/publicaciones/borrador-2");
      expect(res.status).toBe(404);
    });

    it("devuelve 404 si el slug no existe", async () => {
      const res = await request(app).get("/api/v1/publicaciones/no-existe");
      expect(res.status).toBe(404);
    });
  });

  describe("CRUD admin", () => {
    it("crea un borrador y luego lo publica", async () => {
      const crear = await request(app)
        .post("/api/v1/publicaciones")
        .set("Cookie", adminCookies)
        .send({ ...basePub, slug: undefined, publicado: false });

      expect(crear.status).toBe(201);
      expect(crear.body.publicacion.slug).toBe("que-es-una-landing-page");
      expect(crear.body.publicacion).not.toHaveProperty("publicado");

      const id = crear.body.publicacion.id;
      const publicar = await request(app)
        .put(`/api/v1/publicaciones/${id}`)
        .set("Cookie", adminCookies)
        .send({ publicado: true });

      expect(publicar.status).toBe(200);

      const lista = await request(app).get("/api/v1/publicaciones");
      expect(lista.body.publicaciones).toHaveLength(1);
    });

    it("rechaza slug duplicado con 409", async () => {
      await PublicacionModel.create({ ...basePub, slug: "repetido" });

      const res = await request(app)
        .post("/api/v1/publicaciones")
        .set("Cookie", adminCookies)
        .send({ ...basePub, slug: "repetido" });

      expect(res.status).toBe(409);
    });

    it("rechaza secciones inválidas con 400", async () => {
      const res = await request(app)
        .post("/api/v1/publicaciones")
        .set("Cookie", adminCookies)
        .send({ ...basePub, secciones: ["no-existe"] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("el cliente no puede crear publicaciones (403)", async () => {
      const res = await request(app)
        .post("/api/v1/publicaciones")
        .set("Cookie", clienteCookies)
        .send(basePub);

      expect(res.status).toBe(403);
    });

    it("elimina una publicación (204)", async () => {
      const creada = await PublicacionModel.create({ ...basePub, slug: "a-eliminar" });

      const res = await request(app)
        .delete(`/api/v1/publicaciones/${creada._id}`)
        .set("Cookie", adminCookies);

      expect(res.status).toBe(204);
      expect(await PublicacionModel.findById(creada._id)).toBeNull();
    });
  });
});
