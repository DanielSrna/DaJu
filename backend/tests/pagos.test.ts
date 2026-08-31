import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { PagoModel } from "../src/models/pago.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { buildEpaycoSignature } from "../src/adapters/payment/epayco/epayco-signature";
import bcrypt from "bcryptjs";

const paqueteSeed = {
  nombre: "Paquete Validor",
  slug: "validor",
  tipo: "validor" as const,
  descripcion: "Landing page de una vista con 2 meses de soporte",
  precio: 199,
  moneda: "USD",
  vistasIncluidas: 1,
  soporteMeses: 2,
  diasEntrega: 10,
};

describe("Pagos API (checkout + webhook + onboarding)", () => {
  const app = createApp();
  let paqueteId: string;
  let adminCookies: string[];
  let clienteCookies: string[];
  let clienteId: string;

  beforeEach(async () => {
    await PagoModel.deleteMany({});
    await ProyectoModel.deleteMany({});
    await PaqueteModel.deleteMany({});
    await UserModel.deleteMany({});

    const paquete = await PaqueteModel.create(paqueteSeed);
    paqueteId = String(paquete._id);

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
    clienteId = String(cliente._id);
    const loginCliente = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: cliente.email, password: "Cliente123" });
    clienteCookies = loginCliente.headers["set-cookie"] as unknown as string[];
  });

  describe("POST /api/v1/checkout", () => {
    it("crea un pago pendiente y devuelve urlPago", async () => {
      const res = await request(app)
        .post("/api/v1/checkout")
        .send({ paqueteId, email: "comprador@correo.com" });

      expect(res.status).toBe(201);
      expect(res.body.pago).toMatchObject({
        paqueteSlug: "validor",
        monto: 199,
        moneda: "USD",
        estado: "pending",
      });

      const stored = await PagoModel.findById(res.body.pago.id);
      expect(stored).not.toBeNull();
    });

    it("rechaza paquete inexistente con 404", async () => {
      const res = await request(app)
        .post("/api/v1/checkout")
        .send({ paqueteId: "000000000000000000000000", email: "a@b.com" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("rechaza email inválido con 400", async () => {
      const res = await request(app)
        .post("/api/v1/checkout")
        .send({ paqueteId, email: "no-email" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/epayco/webhook", () => {
    const camposWebhook = (refPayco: string, estado: string) => ({
      x_cust_id_cliente: "100000000",
      x_ref_payco: refPayco,
      x_transaction_id: "tx-1",
      x_amount: "199000",
      x_currency_code: "USD",
      x_transaction_state: estado,
    });

    const firmar = (campos: Record<string, string>): string =>
      buildEpaycoSignature(process.env.EPAYCO_PRIVATE_KEY ?? "", {
        custIdCliente: campos.x_cust_id_cliente,
        refPayco: campos.x_ref_payco,
        transactionId: campos.x_transaction_id,
        amount: campos.x_amount,
        currency: campos.x_currency_code,
      });

    it("responde ok si la firma es válida y el pago existe", async () => {
      const checkout = await request(app)
        .post("/api/v1/checkout")
        .send({ paqueteId, email: "comprador@correo.com" });
      const pagoId = checkout.body.pago.id;
      const pago = await PagoModel.findById(pagoId);
      pago!.referencia = "ref-8001";
      await pago!.save();

      const campos = camposWebhook("ref-8001", "Aceptada");
      const res = await request(app)
        .post("/api/v1/epayco/webhook")
        .type("form")
        .send({ ...campos, x_signature: firmar(campos) });

      expect(res.status).toBe(200);
      expect(res.text).toBe("ok");
    });

    it("rechaza con 401 si la firma es inválida", async () => {
      const campos = camposWebhook("ref-8001", "Aceptada");
      const res = await request(app)
        .post("/api/v1/epayco/webhook")
        .type("form")
        .send({ ...campos, x_signature: "firma-invalida" });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("responde ok con firma válida aunque el pago no exista (ePayco no reintenta)", async () => {
      const campos = camposWebhook("ref-inexistente", "Aceptada");
      const res = await request(app)
        .post("/api/v1/epayco/webhook")
        .type("form")
        .send({ ...campos, x_signature: firmar(campos) });

      expect(res.status).toBe(200);
      expect(res.text).toBe("ok");
    });
  });

  describe("GET /api/v1/pagos (admin) y mis-pagos (cliente)", () => {
    it("el admin ve todos los pagos", async () => {
      await PagoModel.create({
        paqueteId,
        paqueteSlug: "validor",
        descripcion: "Paquete Validor",
        monto: 199,
        moneda: "USD",
        emailCliente: "a@b.com",
        estado: "paid",
      });

      const res = await request(app)
        .get("/api/v1/pagos")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.pagos).toHaveLength(1);
      expect(res.body.pagos[0].estado).toBe("paid");
    });

    it("el cliente ve solo sus pagos", async () => {
      await PagoModel.create({
        paqueteId,
        paqueteSlug: "validor",
        descripcion: "Pago mío",
        monto: 199,
        moneda: "USD",
        emailCliente: "cliente@mainplataform.com",
        clienteId,
        estado: "paid",
      });
      await PagoModel.create({
        paqueteId,
        paqueteSlug: "validor",
        descripcion: "Pago ajeno",
        monto: 199,
        moneda: "USD",
        emailCliente: "otro@correo.com",
        estado: "pending",
      });

      const res = await request(app)
        .get("/api/v1/pagos/mis-pagos")
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(200);
      expect(res.body.pagos).toHaveLength(1);
      expect(res.body.pagos[0].descripcion).toBe("Pago mío");
    });

    it("el cliente no puede ver el listado admin (403)", async () => {
      const res = await request(app)
        .get("/api/v1/pagos")
        .set("Cookie", clienteCookies);

      expect(res.status).toBe(403);
    });
  });
});
