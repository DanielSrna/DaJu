import { PaymentProvider } from "./payment-provider.interface";
import { EpaycoPaymentProvider } from "./epayco/epayco-payment.provider";
import { MercadoPagoPaymentProvider } from "./mercadopago/mercadopago-payment.provider";
import { PaypalPaymentProvider } from "./paypal/paypal-payment.provider";
import { FakePaymentProvider } from "./fake/fake-payment.provider";

/**
 * Selección del adaptador de pagos según el entorno (ADR-006 / ADR-007):
 * - Test: FakePaymentProvider (replica la pasarela sin red)
 * - PAYMENT_PROVIDER=paypal → PayPal (pasarela activa; requiere PAYPAL_*)
 * - PAYMENT_PROVIDER=mercadopago → MercadoPago (dormida)
 * - PAYMENT_PROVIDER=epayco o vacío → ePayco (dormida)
 */
export function createPaymentProvider(): PaymentProvider {
  if (process.env.NODE_ENV === "test") {
    return new FakePaymentProvider();
  }
  const activo = (process.env.PAYMENT_PROVIDER ?? "epayco").toLowerCase();
  if (activo === "paypal") {
    return new PaypalPaymentProvider();
  }
  if (activo === "mercadopago") {
    return new MercadoPagoPaymentProvider();
  }
  return new EpaycoPaymentProvider();
}
