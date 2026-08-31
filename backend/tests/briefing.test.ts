import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { PagoModel } from "../src/models/pago.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { BriefingModel } from "../src/models/briefing.model";
import { addBusinessDays } from "../src/utils/fechas";
import bcrypt from "bcryptjs";

const paqueteSeed = {
  nombre: "Paquete Validor",
  slug: "validor",
  tipo: "validor" as const,
  descripcion: "Landing page de una vista",
  precio: 199,
  moneda: "USD",
  vistasIncluidas: 1,
  soporteMeses: 2,
  diasEntrega: 10,
};

describe("Briefing API (documento maestro + archivos)", () => {
  const app = createApp();
  let adminCookies: string[];
  let clienteCookies: string[];
  let proyectoId: string;

  beforeEach(async () => {
    await BriefingModel.deleteMany({});
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
      monto: 199,
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
      estado: "recibido",
      fechaCompra: new Date(),
      fechaEntrega: addBusinessDays(new Date(), 10),
    });
    proyectoId = String(proyecto._id);
  });

  describe("GET /api/v1/briefing/:proyectoId", () => {
    it("crea un briefing vacío la primera vez (cliente dueño)", async () => {
      const res = await request(app)
        .get(`/api/v1/briefing/${proyectoId}`)
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(200);
      expect(res.body.briefing).toMatchObject({
        proyectoId,
        completado: false,
        archivos: [],
      });
    });

    it("el admin ve el briefing de cualquier proyecto", async () => {
      const res = await request(app)
        .get(`/api/v1/briefing/${proyectoId}`)
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
    });

    it("rechaza el briefing de un proyecto ajeno (403)", async () => {
      const otroCliente = await UserModel.create({
        email: "otro@correo.com",
        passwordHash: bcrypt.hashSync("Clave123", 12),
        nombre: "Otro",
        rol: "cliente",
      });

      const paquete = (await PaqueteModel.findOne({ slug: "validor" }))!;
      const pago = await PagoModel.create({
        paqueteId: paquete._id,
        paqueteSlug: "validor",
        descripcion: "Pago ajeno",
        monto: 199,
        moneda: "USD",
        emailCliente: "otro@correo.com",
        clienteId: otroCliente._id,
        estado: "paid",
      });
      const proyectoAjeno = await ProyectoModel.create({
        clienteId: otroCliente._id,
        pagoId: pago._id,
        paquete: {
          slug: "validor",
          nombre: "Validor",
          tipo: "validor",
          vistasIncluidas: 1,
          soporteMeses: 2,
          diasEntrega: 10,
        },
        estado: "recibido",
        fechaCompra: new Date(),
        fechaEntrega: addBusinessDays(new Date(), 10),
      });

      const res = await request(app)
        .get(`/api/v1/briefing/${proyectoAjeno._id}`)
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/v1/briefing/:proyectoId", () => {
    it("guarda el contenido y lo marca como completado", async () => {
      const res = await request(app)
        .put(`/api/v1/briefing/${proyectoId}`)
        .set("Cookie", clienteCookies)
        .send({
          contenido: {
            empresa: "Mi Empresa SAS",
            descripcionNegocio: "Ventas por catálogo",
            objetivos: "Vender más",
            textos: { hero: "Título de bienvenida" },
            requerimientos: "Colores azul y blanco",
          },
          completado: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.briefing.contenido.empresa).toBe("Mi Empresa SAS");
      expect(res.body.briefing.contenido.textos).toEqual({ hero: "Título de bienvenida" });
      expect(res.body.briefing.completado).toBe(true);
    });

    it("requiere autenticación", async () => {
      const res = await request(app)
        .put(`/api/v1/briefing/${proyectoId}`)
        .send({ contenido: { empresa: "X" } });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/briefing/:proyectoId/archivos", () => {
    it("sube un logo PNG válido y queda registrado", async () => {
      const png = await sharp({
        create: { width: 20, height: 20, channels: 3, background: { r: 10, g: 200, b: 30 } },
      })
        .png()
        .toBuffer();

      const res = await request(app)
        .post(`/api/v1/briefing/${proyectoId}/archivos`)
        .set("Cookie", clienteCookies)
        .field("tipo", "logo")
        .attach("archivo", png, { filename: "logo-empresa.png", contentType: "image/png" });

      expect(res.status).toBe(201);
      expect(res.body.briefing.archivos).toHaveLength(1);
      const archivo = res.body.briefing.archivos[0];
      expect(archivo).toMatchObject({
        tipo: "logo",
        mimeType: "image/png",
        nombre: "logo-empresa.png",
      });
      expect(archivo.publicId).toBeDefined();
      expect(archivo.url).toContain("fake-storage.test");
    });

    it("sube un PDF como tipo pdf", async () => {
      const pdf = Buffer.from("%PDF-1.4 contenido del briefing");

      const res = await request(app)
        .post(`/api/v1/briefing/${proyectoId}/archivos`)
        .set("Cookie", clienteCookies)
        .field("tipo", "pdf")
        .attach("archivo", pdf, { filename: "manual.pdf", contentType: "application/pdf" });

      expect(res.status).toBe(201);
      expect(res.body.briefing.archivos[0].mimeType).toBe("application/pdf");
    });

    it("rechaza un archivo que NO es lo que dice ser (400)", async () => {
      const exe = Buffer.from("MZ\x90\x00\x03\x00\x00\x00 contenido malicioso");

      const res = await request(app)
        .post(`/api/v1/briefing/${proyectoId}/archivos`)
        .set("Cookie", clienteCookies)
        .field("tipo", "pdf")
        .attach("archivo", exe, { filename: "manual.pdf", contentType: "application/pdf" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rechaza un PDF enviado como logo (400)", async () => {
      const pdf = Buffer.from("%PDF-1.4 contenido");

      const res = await request(app)
        .post(`/api/v1/briefing/${proyectoId}/archivos`)
        .set("Cookie", clienteCookies)
        .field("tipo", "logo")
        .attach("archivo", pdf, { filename: "logo.pdf", contentType: "application/pdf" });

      expect(res.status).toBe(400);
    });

    it("rechaza archivos de más de 5 MB (400)", async () => {
      const pesado = Buffer.concat([Buffer.from("%PDF-1.4"), Buffer.alloc(6 * 1024 * 1024)]);

      const res = await request(app)
        .post(`/api/v1/briefing/${proyectoId}/archivos`)
        .set("Cookie", clienteCookies)
        .field("tipo", "pdf")
        .attach("archivo", pesado, { filename: "grande.pdf", contentType: "application/pdf" });

      expect(res.status).toBe(400);
    });

    it("rechaza sin archivo (400)", async () => {
      const res = await request(app)
        .post(`/api/v1/briefing/${proyectoId}/archivos`)
        .set("Cookie", clienteCookies)
        .field("tipo", "pdf");

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/v1/briefing/:proyectoId/archivos/:archivoId", () => {
    it("elimina el archivo del briefing y del almacenamiento", async () => {
      const png = await sharp({
        create: { width: 10, height: 10, channels: 3, background: { r: 1, g: 2, b: 3 } },
      })
        .png()
        .toBuffer();

      const subida = await request(app)
        .post(`/api/v1/briefing/${proyectoId}/archivos`)
        .set("Cookie", clienteCookies)
        .field("tipo", "imagen")
        .attach("archivo", png, { filename: "foto.png", contentType: "image/png" });

      const archivoId = subida.body.briefing.archivos[0].id;

      const res = await request(app)
        .delete(`/api/v1/briefing/${proyectoId}/archivos/${archivoId}`)
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(200);
      expect(res.body.briefing.archivos).toHaveLength(0);
    });

    it("devuelve 404 si el archivo no existe", async () => {
      const res = await request(app)
        .delete(`/api/v1/briefing/${proyectoId}/archivos/000000000000000000000000`)
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(404);
    });
  });
});
