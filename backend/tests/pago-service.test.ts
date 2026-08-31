import { PagoService } from "../src/services/pago.service";
import { PaqueteModel } from "../src/models/paquete.model";
import { PagoModel } from "../src/models/pago.model";
import { UserModel } from "../src/models/user.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { PaymentProvider, PaymentResult } from "../src/adapters/payment/payment-provider.interface";

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
    return { eventType: `payment.${this.estadoWebhook}`, paymentId: "fake-ref-1", status: this.estadoWebhook };
  }
}

describe("PagoService (flujo completo con proveedor simulado)", () => {
  const provider = new FakePaymentProvider();
  const service = new PagoService(provider);

  beforeEach(async () => {
    provider.setWebhookState("paid");
    await PagoModel.deleteMany({});
    await ProyectoModel.deleteMany({});
    await UserModel.deleteMany({});
    await PaqueteModel.deleteMany({});
  });

  it("crea un pago pendiente con URL de pago", async () => {
    const paquete = await PaqueteModel.create({
      nombre: "Validor",
      slug: "validor",
      tipo: "validor",
      descripcion: "Landing de una vista",
      precio: 199,
      moneda: "USD",
      vistasIncluidas: 1,
      soporteMeses: 2,
      diasEntrega: 10,
    });

    const resultado = await service.crearCheckout({
      paqueteId: String(paquete._id),
      email: "nuevo@correo.com",
    });

    expect(resultado.urlPago).toBe("https://checkout.epayco.test/pagar");
    expect(resultado.pago.estado).toBe("pending");
    expect(provider.checkoutCount).toBe(1);
  });

  it("onboarding automático: pago aceptado crea cliente y proyecto con fecha de entrega", async () => {
    const paquete = await PaqueteModel.create({
      nombre: "Operativo",
      slug: "operativo",
      tipo: "operativo",
      descripcion: "Mini dashboard con métricas",
      precio: 999,
      moneda: "USD",
      vistasIncluidas: 4,
      soporteMeses: 12,
      diasEntrega: 30,
    });

    const { pago } = await service.crearCheckout({
      paqueteId: String(paquete._id),
      email: "empresa@correo.com",
    });
    const pagoDoc = await PagoModel.findById(pago.id);
    pagoDoc!.referencia = "fake-ref-1";
    await pagoDoc!.save();

    const resultado = await service.procesarWebhook({});

    expect(resultado.estado).toBe("paid");
    expect(resultado.onboarding?.usuario).toBeDefined();
    expect(resultado.onboarding?.proyecto).toBeDefined();

    const cliente = await UserModel.findOne({ email: "empresa@correo.com" });
    expect(cliente).not.toBeNull();
    expect(cliente!.rol).toBe("cliente");

    const proyecto = await ProyectoModel.findOne({ pagoId: pagoDoc!._id });
    expect(proyecto).not.toBeNull();
    expect(proyecto!.estado).toBe("recibido");
    expect(proyecto!.paquete).toMatchObject({
      slug: "operativo",
      tipo: "operativo",
      diasEntrega: 30,
    });
    expect(proyecto!.fechaEntrega.getTime()).toBeGreaterThan(proyecto!.fechaCompra.getTime());
  });

  it("webhook duplicado es idempotente (no duplica proyecto ni cliente)", async () => {
    const paquete = await PaqueteModel.create({
      nombre: "Validor",
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
      email: "idempotente@correo.com",
    });
    const pagoDoc = await PagoModel.findById(pago.id);
    pagoDoc!.referencia = "fake-ref-1";
    await pagoDoc!.save();

    await service.procesarWebhook({});
    const segundo = await service.procesarWebhook({});

    expect(segundo.estado).toBe("paid");
    expect(await UserModel.countDocuments({ email: "idempotente@correo.com" })).toBe(1);
    expect(await ProyectoModel.countDocuments({})).toBe(1);
  });

  it("pago rechazado no crea proyecto", async () => {
    const paquete = await PaqueteModel.create({
      nombre: "Validor",
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
      email: "rechazado@correo.com",
    });
    const pagoDoc = await PagoModel.findById(pago.id);
    pagoDoc!.referencia = "fake-ref-1";
    await pagoDoc!.save();

    provider.setWebhookState("failed");
    const resultado = await service.procesarWebhook({});

    expect(resultado.estado).toBe("failed");
    expect(resultado.onboarding).toBeUndefined();
    expect(await ProyectoModel.countDocuments({})).toBe(0);

    const pagoFinal = await PagoModel.findById(pago.id);
    expect(pagoFinal!.estado).toBe("failed");
  });

  it("cliente ya registrado se vincula sin duplicarlo", async () => {
    await UserModel.create({
      email: "ya-registrado@correo.com",
      passwordHash: "hash-existente",
      nombre: "Cliente Existente",
      rol: "cliente",
    });

    const paquete = await PaqueteModel.create({
      nombre: "Validor",
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
      email: "ya-registrado@correo.com",
    });
    const pagoDoc = await PagoModel.findById(pago.id);
    pagoDoc!.referencia = "fake-ref-1";
    await pagoDoc!.save();

    const antes = await UserModel.countDocuments({ email: "ya-registrado@correo.com" });
    expect(antes).toBe(1);

    const resultado = await service.procesarWebhook({});

    expect(await UserModel.countDocuments({ email: "ya-registrado@correo.com" })).toBe(1);
    const pagoFinal = await PagoModel.findById(pago.id);
    expect(String(pagoFinal!.clienteId)).toBe(String((await UserModel.findOne({ email: "ya-registrado@correo.com" }))!._id));
    expect(resultado.estado).toBe("paid");
  });
});
