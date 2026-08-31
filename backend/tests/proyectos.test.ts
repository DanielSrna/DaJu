import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { PagoModel } from "../src/models/pago.model";
import { CapacidadConfigModel } from "../src/models/capacidad-config.model";
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

async function crearProyectoConPago(
  email: string,
  rol: "admin" | "cliente" = "cliente",
): Promise<string> {
  let user = await UserModel.findOne({ email });
  if (!user) {
    user = await UserModel.create({
      email,
      passwordHash: bcrypt.hashSync("Clave123", 12),
      nombre: "Usuario",
      rol,
    });
  }
  let paquete = await PaqueteModel.findOne({ slug: paqueteSeed.slug });
  if (!paquete) {
    paquete = await PaqueteModel.create(paqueteSeed);
  }
  const pago = await PagoModel.create({
    paqueteId: paquete._id,
    paqueteSlug: paquete.slug,
    descripcion: "Pago",
    monto: 999,
    moneda: "USD",
    emailCliente: email,
    clienteId: user._id,
    estado: "paid",
  });
  const proyecto = await ProyectoModel.create({
    clienteId: user._id,
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
    fechaEntrega: addBusinessDays(new Date(), 30),
  });
  return String(proyecto._id);
}

describe("Proyectos API (centro de proyectos + gestor de capacidad)", () => {
  const app = createApp();
  let adminCookies: string[];
  let clienteCookies: string[];

  beforeEach(async () => {
    await CapacidadConfigModel.deleteMany({});
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
  });

  describe("GET /api/v1/proyectos (cliente)", () => {
    it("el cliente ve solo sus proyectos", async () => {
      await crearProyectoConPago("cliente@mainplataform.com");
      await crearProyectoConPago("otro@correo.com");

      const res = await request(app)
        .get("/api/v1/proyectos")
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(200);
      expect(res.body.proyectos).toHaveLength(1);
      expect(res.body.proyectos[0].cliente.email).toBe("cliente@mainplataform.com");
    });

    it("requiere autenticación", async () => {
      const res = await request(app).get("/api/v1/proyectos");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/proyectos/admin (filtros y paginación)", () => {
    it("el admin ve todos con filtro por email", async () => {
      await crearProyectoConPago("cliente@mainplataform.com");
      await crearProyectoConPago("otro@correo.com");

      const res = await request(app)
        .get("/api/v1/proyectos/admin?email=otro")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.proyectos[0].cliente.email).toBe("otro@correo.com");
    });

    it("filtra por estado", async () => {
      const id = await crearProyectoConPago("cliente@mainplataform.com");
      await ProyectoModel.findByIdAndUpdate(id, { estado: "entregado", fechaEntregado: new Date() });

      const res = await request(app)
        .get("/api/v1/proyectos/admin?estado=entregado")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
    });

    it("pagina correctamente", async () => {
      for (let i = 0; i < 5; i++) {
        await crearProyectoConPago(`cliente${i}@correo.com`);
      }

      const res = await request(app)
        .get("/api/v1/proyectos/admin?pagina=1&limite=2")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.proyectos).toHaveLength(2);
      expect(res.body.total).toBe(5);
      expect(res.body.totalPaginas).toBe(3);
    });

    it("el cliente no puede acceder al centro admin (403)", async () => {
      const res = await request(app)
        .get("/api/v1/proyectos/admin")
        .set("Cookie", clienteCookies);
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/proyectos/:id", () => {
    it("el cliente no ve proyectos ajenos (403)", async () => {
      const id = await crearProyectoConPago("otro@correo.com");

      const res = await request(app)
        .get(`/api/v1/proyectos/${id}`)
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(403);
    });

    it("el admin ve cualquier proyecto", async () => {
      const id = await crearProyectoConPago("otro@correo.com");

      const res = await request(app)
        .get(`/api/v1/proyectos/${id}`)
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.proyecto.paquete.tipo).toBe("operativo");
    });
  });

  describe("PUT /api/v1/proyectos/:id/estado (monitor)", () => {
    it("avanza el estado secuencialmente y fija fechaEntregado al entregar", async () => {
      const id = await crearProyectoConPago("cliente@mainplataform.com");

      const paso1 = await request(app)
        .put(`/api/v1/proyectos/${id}/estado`)
        .set("Cookie", adminCookies)
        .send({ estado: "diseno" });
      expect(paso1.status).toBe(200);
      expect(paso1.body.proyecto.estado).toBe("diseno");

      const paso2 = await request(app)
        .put(`/api/v1/proyectos/${id}/estado`)
        .set("Cookie", adminCookies)
        .send({ estado: "desarrollo" });
      expect(paso2.status).toBe(200);

      const entrega = await request(app)
        .put(`/api/v1/proyectos/${id}/estado`)
        .set("Cookie", adminCookies)
        .send({ estado: "entregado" });
      expect(entrega.status).toBe(200);
      expect(entrega.body.proyecto.estado).toBe("entregado");
      expect(entrega.body.proyecto.fechaEntregado).toBeDefined();

      const doc = await ProyectoModel.findById(id);
      expect(doc!.fechaEntregado).not.toBeNull();
    });

    it("rechaza saltarse estados (recibido -> desarrollo = 400)", async () => {
      const id = await crearProyectoConPago("cliente@mainplataform.com");

      const res = await request(app)
        .put(`/api/v1/proyectos/${id}/estado`)
        .set("Cookie", adminCookies)
        .send({ estado: "desarrollo" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("el cliente no puede cambiar estados (403)", async () => {
      const id = await crearProyectoConPago("cliente@mainplataform.com");

      const res = await request(app)
        .put(`/api/v1/proyectos/${id}/estado`)
        .set("Cookie", clienteCookies)
        .send({ estado: "diseno" });

      expect(res.status).toBe(403);
    });
  });

  describe("GET/PUT /api/v1/capacidad (gestor de capacidad)", () => {
    it("el admin ve la configuración por defecto", async () => {
      const res = await request(app)
        .get("/api/v1/capacidad")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.ajustes).toEqual({
        validor: 0,
        corporativo: 0,
        operativo: 0,
      });
    });

    it("actualiza ajustes y recalcula fechas de proyectos pendientes", async () => {
      const id = await crearProyectoConPago("cliente@mainplataform.com");
      const antes = (await ProyectoModel.findById(id))!;

      const res = await request(app)
        .put("/api/v1/capacidad")
        .set("Cookie", adminCookies)
        .send({ operativo: 5 });

      expect(res.status).toBe(200);
      expect(res.body.ajustes.operativo).toBe(5);
      expect(res.body.proyectosRecalculados).toBe(1);

      const despues = (await ProyectoModel.findById(id))!;
      const esperado = addBusinessDays(new Date(antes.fechaCompra), 35);
      expect(despues.fechaEntrega.getTime()).toBeGreaterThan(antes.fechaEntrega.getTime());
      expect(despues.fechaEntrega.toISOString().slice(0, 10)).toBe(
        esperado.toISOString().slice(0, 10),
      );
    });

    it("rechaza ajustes fuera de rango (400)", async () => {
      const res = await request(app)
        .put("/api/v1/capacidad")
        .set("Cookie", adminCookies)
        .send({ operativo: 99 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("el cliente no puede tocar la capacidad (403)", async () => {
      const res = await request(app)
        .put("/api/v1/capacidad")
        .set("Cookie", clienteCookies)
        .send({ operativo: 1 });

      expect(res.status).toBe(403);
    });

    it("no recalcula proyectos ya entregados", async () => {
      const id = await crearProyectoConPago("cliente@mainplataform.com");
      await ProyectoModel.findByIdAndUpdate(id, { estado: "entregado", fechaEntregado: new Date() });

      const res = await request(app)
        .put("/api/v1/capacidad")
        .set("Cookie", adminCookies)
        .send({ operativo: 5 });

      expect(res.body.proyectosRecalculados).toBe(0);
    });
  });
});
