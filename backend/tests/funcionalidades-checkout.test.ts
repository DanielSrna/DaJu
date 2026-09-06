import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { PagoModel } from "../src/models/pago.model";
import { FuncionalidadExtraModel } from "../src/models/funcionalidad-extra.model";
import { ProyectoModel } from "../src/models/proyecto.model";
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

async function crearFuncionalidad(overrides: Record<string, unknown> = {}) {
  return FuncionalidadExtraModel.create({
    nombre: "Formulario de contacto",
    clave: "formulario-de-contacto",
    categoria: "pagina",
    complejidad: "facil",
    precio: 20,
    activo: true,
    ...overrides,
  });
}

describe("Funcionalidades extra + checkout ampliado", () => {
  const app = createApp();
  let adminCookies: string[];
  let paqueteId: string;

  beforeEach(async () => {
    await ProyectoModel.deleteMany({});
    await PagoModel.deleteMany({});
    await FuncionalidadExtraModel.deleteMany({});
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

    const paquete = await PaqueteModel.create(paqueteSeed);
    paqueteId = String(paquete._id);
  });

  describe("GET /api/v1/funcionalidades (público)", () => {
    it("devuelve solo funcionalidades activas", async () => {
      await crearFuncionalidad();
      await crearFuncionalidad({
        nombre: "Chat en vivo",
        clave: "chat-en-vivo",
        activo: false,
      });

      const res = await request(app).get("/api/v1/funcionalidades");

      expect(res.status).toBe(200);
      expect(res.body.funcionalidades).toHaveLength(1);
      expect(res.body.funcionalidades[0].nombre).toBe("Formulario de contacto");
    });
  });

  describe("CRUD admin de funcionalidades", () => {
    it("crea y luego desactiva una funcionalidad", async () => {
      const crear = await request(app)
        .post("/api/v1/funcionalidades")
        .set("Cookie", adminCookies)
        .send({
          nombre: "Panel de métricas",
          categoria: "datos",
          complejidad: "dificil",
          precio: 80,
        });

      expect(crear.status).toBe(201);
      expect(crear.body.funcionalidad.precio).toBe(80);
      const id = crear.body.funcionalidad.id;

      const desactivar = await request(app)
        .put(`/api/v1/funcionalidades/${id}`)
        .set("Cookie", adminCookies)
        .send({ activo: false });
      expect(desactivar.status).toBe(200);
      expect(desactivar.body.funcionalidad.activo).toBe(false);
    });

    it("rechaza nombre duplicado con 409", async () => {
      await crearFuncionalidad();

      const res = await request(app)
        .post("/api/v1/funcionalidades")
        .set("Cookie", adminCookies)
        .send({ nombre: "Formulario de contacto", categoria: "pagina", complejidad: "facil", precio: 20 });

      expect(res.status).toBe(409);
    });

    it("el cliente no puede crear funcionalidades (403)", async () => {
      const cliente = await UserModel.create({
        email: "cliente@mainplataform.com",
        passwordHash: bcrypt.hashSync("Cliente123", 12),
        nombre: "Cliente",
        rol: "cliente",
      });
      const login = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: cliente.email, password: "Cliente123" });
      const cookies = login.headers["set-cookie"] as unknown as string[];

      const res = await request(app)
        .post("/api/v1/funcionalidades")
        .set("Cookie", cookies)
        .send({ nombre: "X", categoria: "pagina", complejidad: "facil", precio: 10 });

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/checkout con extras y registro", () => {
    it("crea la cuenta y cobra base + extras con desglose", async () => {
      const extra = await crearFuncionalidad({ precio: 20 });

      const res = await request(app)
        .post("/api/v1/checkout")
        .send({
          paqueteId,
          email: "nuevo@correo.com",
          nombre: "Nuevo Cliente",
          password: "Clave123",
          funcionalidades: [String(extra._id)],
        });

      expect(res.status).toBe(201);
      expect(res.body.pago.monto).toBe(999 + 20);
      expect(res.body.pago.funcionalidades).toHaveLength(1);
      expect(res.body.pago.funcionalidades[0].nombre).toBe("Formulario de contacto");

      const cuenta = await UserModel.findOne({ email: "nuevo@correo.com" });
      expect(cuenta).not.toBeNull();
      expect(cuenta!.rol).toBe("cliente");
    });

    it("no duplica funcionalidades repetidas en la misma compra", async () => {
      const extra = await crearFuncionalidad({ precio: 20 });

      const res = await request(app)
        .post("/api/v1/checkout")
        .send({
          paqueteId,
          email: "repe@correo.com",
          nombre: "Repe",
          password: "Clave123",
          funcionalidades: [String(extra._id), String(extra._id)],
        });

      expect(res.status).toBe(201);
      expect(res.body.pago.funcionalidades).toHaveLength(1);
      expect(res.body.pago.monto).toBe(999 + 20);
    });

    it("valida contraseña si el email ya existe (401)", async () => {
      await UserModel.create({
        email: "existente@correo.com",
        passwordHash: bcrypt.hashSync("OtraClave123", 12),
        nombre: "Existente",
        rol: "cliente",
      });

      const res = await request(app)
        .post("/api/v1/checkout")
        .send({
          paqueteId,
          email: "existente@correo.com",
          password: "Incorrecta123",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("acepta email existente con contraseña correcta", async () => {
      await UserModel.create({
        email: "existente@correo.com",
        passwordHash: bcrypt.hashSync("Clave123", 12),
        nombre: "Existente",
        rol: "cliente",
      });

      const res = await request(app)
        .post("/api/v1/checkout")
        .send({ paqueteId, email: "existente@correo.com", password: "Clave123" });

      expect(res.status).toBe(201);
    });

    it("rechaza funcionalidad inactiva o inexistente (400)", async () => {
      const inactiva = await crearFuncionalidad({ activo: false });

      const res = await request(app)
        .post("/api/v1/checkout")
        .send({
          paqueteId,
          email: "x@correo.com",
          nombre: "X",
          password: "Clave123",
          funcionalidades: [String(inactiva._id)],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rechaza más de 10 funcionalidades (400)", async () => {
      const ids = [];
      for (let i = 0; i < 11; i++) {
        const f = await crearFuncionalidad({
          nombre: `Funcionalidad ${i}`,
          clave: `funcionalidad-${i}`,
          precio: 20,
        });
        ids.push(String(f._id));
      }

      const res = await request(app)
        .post("/api/v1/checkout")
        .send({
          paqueteId,
          email: "muchas@correo.com",
          nombre: "Muchas",
          password: "Clave123",
          funcionalidades: ids,
        });

      expect(res.status).toBe(400);
    });

    it("guarda negociarDespues en el pago", async () => {
      const res = await request(app)
        .post("/api/v1/checkout")
        .send({
          paqueteId,
          email: "negocia@correo.com",
          nombre: "Negocia",
          password: "Clave123",
          negociarDespues: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.pago.negociarDespues).toBe(true);
    });
  });

  describe("Webhook paid crea proyecto con snapshot de extras", () => {
    it("el proyecto guarda las funcionalidades compradas", async () => {
      const extra = await crearFuncionalidad({ precio: 20 });
      const checkout = await request(app)
        .post("/api/v1/checkout")
        .send({
          paqueteId,
          email: "proyecto-extra@correo.com",
          nombre: "Con Extra",
          password: "Clave123",
          funcionalidades: [String(extra._id)],
        });
      const pagoId = checkout.body.pago.id;
      const pago = await PagoModel.findById(pagoId);
      pago!.referencia = "fake-ref-extra-1";
      await pago!.save();

      const firma = require("crypto")
        .createHash("md5")
        .update(["", "100000000", "fake-ref-extra-1", "tx-1", "101900", "USD"].join("~"))
        .digest("hex");

      await request(app)
        .post("/api/v1/epayco/webhook")
        .type("form")
        .send({
          x_cust_id_cliente: "100000000",
          x_ref_payco: "fake-ref-extra-1",
          x_transaction_id: "tx-1",
          x_amount: "101900",
          x_currency_code: "USD",
          x_transaction_state: "Aceptada",
          x_signature: firma,
        });

      const proyecto = await ProyectoModel.findOne({ pagoId: pago!._id });
      expect(proyecto).not.toBeNull();
      expect(proyecto!.funcionalidades).toHaveLength(1);
      expect(proyecto!.funcionalidades[0]).toMatchObject({
        nombre: "Formulario de contacto",
        precio: 20,
      });
    });
  });
});
