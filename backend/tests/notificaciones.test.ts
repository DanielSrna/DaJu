import { NotificacionesService } from "../src/services/notificaciones.service";
import { ProyectoService } from "../src/services/proyecto.service";
import { PagoService } from "../src/services/pago.service";
import { FakeEmailProvider } from "../src/adapters/email/fake/fake-email.provider";
import { FakePaymentProvider } from "../src/adapters/payment/fake/fake-payment.provider";
import { buildEpaycoSignature } from "../src/adapters/payment/epayco/epayco-signature";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { PagoModel } from "../src/models/pago.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import bcrypt from "bcryptjs";

/** Body de webhook firmado como lo haría ePayco (misma llave configurada en tests). */
function webhookFirmado(refPayco: string, estado = "Aceptada"): Record<string, string> {
  const campos = {
    x_cust_id_cliente: "100000000",
    x_ref_payco: refPayco,
    x_transaction_id: "tx-1",
    x_amount: "999000",
    x_currency_code: "USD",
    x_transaction_state: estado,
  };
  return {
    ...campos,
    x_signature: buildEpaycoSignature(process.env.EPAYCO_PRIVATE_KEY ?? "", {
      custIdCliente: campos.x_cust_id_cliente,
      refPayco: campos.x_ref_payco,
      transactionId: campos.x_transaction_id,
      amount: campos.x_amount,
      currency: campos.x_currency_code,
    }),
  };
}

describe("Notificaciones (gatillo por estados)", () => {
  beforeEach(async () => {
    await PagoModel.deleteMany({});
    await ProyectoModel.deleteMany({});
    await UserModel.deleteMany({});
    await PaqueteModel.deleteMany({});
  });

  describe("NotificacionesService (unit)", () => {
    const fakeEmail = new FakeEmailProvider();

    beforeEach(() => {
      fakeEmail.enviados.length = 0;
    });

    it("envía credenciales con la contraseña temporal", async () => {
      const servicio = new NotificacionesService(fakeEmail);

      await servicio.enviarCredenciales({
        email: "nuevo@correo.com",
        passwordTemporal: "temp-abc123",
      });

      expect(fakeEmail.enviados).toHaveLength(1);
      expect(fakeEmail.enviados[0].to).toBe("nuevo@correo.com");
      expect(fakeEmail.enviados[0].subject).toContain("credenciales");
      expect(fakeEmail.enviados[0].html).toContain("temp-abc123");
    });

    it("envía aviso de avance de estado", async () => {
      const servicio = new NotificacionesService(fakeEmail);

      await servicio.enviarAvanceProyecto({
        clienteEmail: "cliente@correo.com",
        clienteNombre: "María",
        proyectoNombre: "Paquete Operativo",
        estado: "desarrollo",
      });

      expect(fakeEmail.enviados[0].subject).toContain("Desarrollo");
    });

    it("envía aviso de entrega con fecha de garantía", async () => {
      const servicio = new NotificacionesService(fakeEmail);

      await servicio.enviarEntrega({
        clienteEmail: "cliente@correo.com",
        clienteNombre: "María",
        proyectoNombre: "Paquete Operativo",
        fechaExpiracionGarantia: new Date("2027-08-30"),
      });

      expect(fakeEmail.enviados[0].subject).toContain("entregado");
      expect(fakeEmail.enviados[0].html).toContain("30/8/2027");
    });

    it("escapa HTML en los correos (anti-XSS)", async () => {
      const servicio = new NotificacionesService(fakeEmail);

      await servicio.enviarAvanceProyecto({
        clienteEmail: "cliente@correo.com",
        clienteNombre: "<script>alert(1)</script>",
        proyectoNombre: "X",
        estado: "diseno",
      });

      expect(fakeEmail.enviados[0].html).not.toContain("<script>");
    });
  });

  describe("PagoService — onboarding envía credenciales + confirmación", () => {
    it("envía credenciales y compra confirmada cuando el cliente es nuevo", async () => {
      const fakeEmail = new FakeEmailProvider();
      const fakePagos = new FakePaymentProvider();
      const servicio = new PagoService(fakePagos, new NotificacionesService(fakeEmail));

      const paquete = await PaqueteModel.create({
        nombre: "Operativo",
        slug: "operativo",
        tipo: "operativo",
        descripcion: "Mini dashboard",
        precio: 999,
        moneda: "USD",
        vistasIncluidas: 4,
        soporteMeses: 12,
        diasEntrega: 30,
      });

      const { pago } = await servicio.crearCheckout({
        paqueteId: String(paquete._id),
        email: "nuevo-comprador@correo.com",
      });
      const pagoDoc = await PagoModel.findById(pago.id);
      pagoDoc!.referencia = "fake-ref-1";
      await pagoDoc!.save();

      await servicio.procesarWebhook(webhookFirmado("fake-ref-1"));

      expect(fakeEmail.enviados.length).toBeGreaterThanOrEqual(2);
      const asuntos = fakeEmail.enviados.map((e) => e.subject);
      expect(asuntos.some((s) => s.toLowerCase().includes("credenciales"))).toBe(true);
      expect(asuntos.some((s) => s.toLowerCase().includes("confirmado"))).toBe(true);
    });

    it("NO envía credenciales si el cliente ya existía (solo confirmación)", async () => {
      const fakeEmail = new FakeEmailProvider();
      const fakePagos = new FakePaymentProvider();
      const servicio = new PagoService(fakePagos, new NotificacionesService(fakeEmail));

      await UserModel.create({
        email: "ya-registrado@correo.com",
        passwordHash: bcrypt.hashSync("Clave123", 12),
        nombre: "Cliente Existente",
        rol: "cliente",
      });

      const paquete = await PaqueteModel.create({
        nombre: "Operativo",
        slug: "operativo",
        tipo: "operativo",
        descripcion: "Mini dashboard",
        precio: 999,
        moneda: "USD",
        vistasIncluidas: 4,
        soporteMeses: 12,
        diasEntrega: 30,
      });

      const { pago } = await servicio.crearCheckout({
        paqueteId: String(paquete._id),
        email: "ya-registrado@correo.com",
      });
      const pagoDoc = await PagoModel.findById(pago.id);
      pagoDoc!.referencia = "fake-ref-1";
      await pagoDoc!.save();

      await servicio.procesarWebhook(webhookFirmado("fake-ref-1"));

      const asuntos = fakeEmail.enviados.map((e) => e.subject);
      expect(asuntos.some((s) => s.toLowerCase().includes("credenciales"))).toBe(false);
      expect(asuntos.some((s) => s.toLowerCase().includes("confirmado"))).toBe(true);
    });
  });

  describe("ProyectoService — avances de estado notifican al cliente", () => {
    it("avisa en cada transición y aviso especial al entregar", async () => {
      const fakeEmail = new FakeEmailProvider();
      const servicio = new ProyectoService(new NotificacionesService(fakeEmail));

      const cliente = await UserModel.create({
        email: "cliente@correo.com",
        passwordHash: bcrypt.hashSync("Clave123", 12),
        nombre: "María",
        rol: "cliente",
      });
      const paquete = await PaqueteModel.create({
        nombre: "Operativo",
        slug: "operativo",
        tipo: "operativo",
        descripcion: "Mini dashboard",
        precio: 999,
        moneda: "USD",
        vistasIncluidas: 4,
        soporteMeses: 12,
        diasEntrega: 30,
      });
      const pago = await PagoModel.create({
        paqueteId: paquete._id,
        paqueteSlug: "operativo",
        descripcion: "Pago",
        monto: 999,
        moneda: "USD",
        emailCliente: "cliente@correo.com",
        clienteId: cliente._id,
        estado: "paid",
      });
      const proyecto = await ProyectoModel.create({
        clienteId: cliente._id,
        pagoId: pago._id,
        paquete: {
          slug: "operativo",
          nombre: "Paquete Operativo",
          tipo: "operativo",
          vistasIncluidas: 4,
          soporteMeses: 12,
          diasEntrega: 30,
        },
        estado: "recibido",
        fechaCompra: new Date(),
        fechaEntrega: new Date(Date.now() + 30 * 86_400_000),
      });

      await servicio.cambiarEstado(String(proyecto._id), "diseno", "admin", "");
      await servicio.cambiarEstado(String(proyecto._id), "desarrollo", "admin", "");
      await servicio.cambiarEstado(String(proyecto._id), "entregado", "admin", "");

      const asuntos = fakeEmail.enviados.map((e) => e.subject);
      expect(asuntos.some((s) => s.includes("Diseño"))).toBe(true);
      expect(asuntos.some((s) => s.includes("Desarrollo"))).toBe(true);
      expect(asuntos.some((s) => s.includes("entregado"))).toBe(true);

      const entrega = fakeEmail.enviados.find((e) => e.subject.includes("entregado"));
      expect(entrega!.html).toContain("garantía");
    });
  });
});
