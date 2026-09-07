import { PagoService } from "../src/services/pago.service";
import request from "supertest";
import { createApp } from "../src/app";
import { PaqueteModel } from "../src/models/paquete.model";
import { PlantillaModel } from "../src/models/plantilla.model";
import { ServicioModel } from "../src/models/servicio.model";
import { PagoModel } from "../src/models/pago.model";
import { UserModel } from "../src/models/user.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { CmsConfigModel } from "../src/models/cms-config.model";
import { FuncionalidadExtraModel } from "../src/models/funcionalidad-extra.model";
import {
  PaymentProvider,
  PaymentResult,
} from "../src/adapters/payment/payment-provider.interface";
import bcrypt from "bcryptjs";

class FakePaymentProvider implements PaymentProvider {
  private estadoWebhook: PaymentResult["status"] = "paid";
  checkoutCount = 0;

  setWebhookState(estado: PaymentResult["status"]): void {
    this.estadoWebhook = estado;
  }

  async createCheckout(_params: {
    amount: number;
    currency: string;
    description: string;
    clientEmail: string;
    metadata: Record<string, string>;
  }): Promise<PaymentResult> {
    this.checkoutCount += 1;
    return {
      paymentId: `fake-ref-${this.checkoutCount}`,
      status: "pending",
      checkoutUrl: "https://checkout.epayco.test/pagar",
    };
  }

  async handleWebhook(_body: Record<string, unknown>): Promise<{
    eventType: string;
    paymentId: string;
    status: PaymentResult["status"];
  }> {
    return {
      eventType: `payment.${this.estadoWebhook}`,
      paymentId: "fake-ref-1",
      status: this.estadoWebhook,
    };
  }
}

describe("Checkout multiproducto (paquete / plantilla / servicio)", () => {
  const provider = new FakePaymentProvider();
  const service = new PagoService(provider);

  beforeEach(async () => {
    provider.setWebhookState("paid");
    provider.checkoutCount = 0;
    await PagoModel.deleteMany({});
    await ProyectoModel.deleteMany({});
    await UserModel.deleteMany({});
    await PaqueteModel.deleteMany({});
    await PlantillaModel.deleteMany({});
    await ServicioModel.deleteMany({});
    await FuncionalidadExtraModel.deleteMany({});
    await CmsConfigModel.deleteMany({});
  });

  async function cuenta(email: string): Promise<string> {
    const cliente = await UserModel.create({
      email,
      passwordHash: bcrypt.hashSync("Clave123", 12),
      nombre: "Cliente",
      rol: "cliente",
    });
    return String(cliente._id);
  }

  it("checkout de plantilla cobra base + funcionalidades extra", async () => {
    const plantilla = await PlantillaModel.create({
      nombre: "Plantilla Reservas",
      slug: "reservas",
      plataforma: "Reservas",
      descripcion: "Sistema de reservas",
      precio: 299,
      moneda: "USD",
      vistasIncluidas: 5,
      soporteMeses: 3,
      diasEntrega: 20,
    });
    const extra = await FuncionalidadExtraModel.create({
      nombre: "Notificaciones por WhatsApp",
      clave: "notificaciones-whatsapp",
      categoria: "integraciones",
      complejidad: "media",
      precio: 45,
      activo: true,
    });

    const { pago } = await service.crearCheckout({
      tipoProducto: "plantilla",
      productoId: String(plantilla._id),
      email: "cliente@correo.com",
      nombre: "Cliente",
      password: "Clave123",
      funcionalidades: [String(extra._id)],
    });

    expect(pago.tipoProducto).toBe("plantilla");
    expect(pago.productoSlug).toBe("reservas");
    expect(pago.monto).toBe(344);
    expect(pago.funcionalidades).toHaveLength(1);
  });

  it("checkout de servicio multiplica precio por cantidad de sesiones", async () => {
    const servicio = await ServicioModel.create({
      nombre: "Asesoría técnica",
      slug: "asesoria-tecnica",
      categoria: "asesoria",
      descripcion: "Asesoría privada 1:1",
      precio: 90,
      moneda: "USD",
      duracionMin: 60,
      canal: "Meet",
    });

    const { pago } = await service.crearCheckout({
      tipoProducto: "servicio",
      productoId: String(servicio._id),
      cantidad: 3,
      email: "cliente@correo.com",
      nombre: "Cliente",
      password: "Clave123",
    });

    expect(pago.tipoProducto).toBe("servicio");
    expect(pago.cantidad).toBe(3);
    expect(pago.monto).toBe(270);
    expect(pago.descripcion).toContain("3 sesiones");
  });

  it("el checkout legacy (paqueteId sin tipoProducto) sigue igual", async () => {
    const paquete = await PaqueteModel.create({
      nombre: "Paquete Validor",
      slug: "validor",
      tipo: "validor",
      descripcion: "Landing de una vista",
      precio: 199,
      moneda: "USD",
      vistasIncluidas: 1,
      soporteMeses: 2,
      diasEntrega: 10,
    });

    const { pago } = await service.crearCheckout({
      paqueteId: String(paquete._id),
      email: "cliente@correo.com",
      nombre: "Cliente",
      password: "Clave123",
    });

    expect(pago.tipoProducto).toBe("paquete");
    expect(pago.paqueteSlug).toBe("validor");
    expect(pago.monto).toBe(199);
  });

  it("webhook pagado de plantilla crea cuenta pero NO proyecto", async () => {
    const plantilla = await PlantillaModel.create({
      nombre: "Plantilla Reservas",
      slug: "reservas",
      plataforma: "Reservas",
      descripcion: "Sistema de reservas",
      precio: 299,
      moneda: "USD",
      vistasIncluidas: 5,
      soporteMeses: 3,
      diasEntrega: 20,
    });

    const { pago } = await service.crearCheckout({
      tipoProducto: "plantilla",
      productoId: String(plantilla._id),
      email: "nueva@correo.com",
      nombre: "Nueva",
      password: "Clave123",
    });
    const pagoDoc = await PagoModel.findById(pago.id);
    pagoDoc!.referencia = "fake-ref-1";
    await pagoDoc!.save();

    const resultado = await service.procesarWebhook({});

    expect(resultado.estado).toBe("paid");
    expect(resultado.onboarding?.usuario).toBeDefined();
    expect(await ProyectoModel.countDocuments({})).toBe(0);
    expect(await UserModel.countDocuments({ email: "nueva@correo.com" })).toBe(1);
    expect(await PagoModel.findById(pago.id)).toMatchObject({
      estado: "paid",
      tipoProducto: "plantilla",
    });
  });

  it("webhook pagado de servicio NO crea proyecto (solo pago + cuenta)", async () => {
    const servicio = await ServicioModel.create({
      nombre: "Aceleración de proyecto",
      slug: "aceleracion-proyecto",
      categoria: "aceleracion",
      descripcion: "Impulso para tu equipo",
      precio: 150,
      moneda: "USD",
      duracionMin: 90,
      canal: "Zoom",
    });

    const { pago } = await service.crearCheckout({
      tipoProducto: "servicio",
      productoId: String(servicio._id),
      email: "sesion@correo.com",
      nombre: "Cliente",
      password: "Clave123",
    });
    const pagoDoc = await PagoModel.findById(pago.id);
    pagoDoc!.referencia = "fake-ref-1";
    await pagoDoc!.save();

    const resultado = await service.procesarWebhook({});

    expect(resultado.estado).toBe("paid");
    expect(await ProyectoModel.countDocuments({})).toBe(0);
    expect(await UserModel.countDocuments({ email: "sesion@correo.com" })).toBe(1);
  });

  it("la suscripción de plantilla nunca pisa el catálogo de paquetes en el proyecto", async () => {
    const plantilla = await PlantillaModel.create({
      nombre: "Plantilla Citas",
      slug: "citas",
      plataforma: "Citas",
      descripcion: "Agenda profesional",
      precio: 249,
      moneda: "USD",
      vistasIncluidas: 4,
      soporteMeses: 3,
      diasEntrega: 18,
    });

    await cuenta("recurrente@correo.com");
    const { pago } = await service.crearCheckout({
      tipoProducto: "plantilla",
      productoId: String(plantilla._id),
      email: "recurrente@correo.com",
      password: "Clave123",
    });
    const pagoDoc = await PagoModel.findById(pago.id);
    pagoDoc!.referencia = "fake-ref-1";
    await pagoDoc!.save();

    await service.procesarWebhook({});
    const pagoFinal = await PagoModel.findById(pago.id);

    expect(pagoFinal!.estado).toBe("paid");
    expect(await ProyectoModel.countDocuments({ pagoId: pagoDoc!._id })).toBe(0);
  });

  it("HTTP POST /checkout acepta servicio con cantidad y responde 201", async () => {
    const app = createApp();
    const servicio = await ServicioModel.create({
      nombre: "Asesoría técnica",
      slug: "asesoria-tecnica",
      categoria: "asesoria",
      descripcion: "Asesoría privada 1:1",
      precio: 90,
      moneda: "USD",
      duracionMin: 60,
      canal: "Meet",
    });

    const res = await request(app).post("/api/v1/checkout").send({
      tipoProducto: "servicio",
      productoId: String(servicio._id),
      cantidad: 2,
      nombre: "Cliente HTTP",
      email: "http@correo.com",
      password: "Clave123",
    });

    expect(res.status).toBe(201);
    expect(res.body.pago.tipoProducto).toBe("servicio");
    expect(res.body.pago.cantidad).toBe(2);
    expect(res.body.pago.monto).toBe(180);
  });

  it("HTTP POST /checkout legacy (solo paqueteId) sigue respondiendo 201", async () => {
    const app = createApp();
    const paquete = await PaqueteModel.create({
      nombre: "Paquete Validor",
      slug: "validor",
      tipo: "validor",
      descripcion: "Landing de una vista",
      precio: 199,
      moneda: "USD",
      vistasIncluidas: 1,
      soporteMeses: 2,
      diasEntrega: 10,
    });

    const res = await request(app).post("/api/v1/checkout").send({
      paqueteId: String(paquete._id),
      nombre: "Cliente HTTP",
      email: "http2@correo.com",
      password: "Clave123",
    });

    expect(res.status).toBe(201);
    expect(res.body.pago.tipoProducto).toBe("paquete");
    expect(res.body.pago.paqueteSlug).toBe("validor");
  });
});
