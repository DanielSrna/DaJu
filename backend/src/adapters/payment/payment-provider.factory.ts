import { PaymentProvider } from "./payment-provider.interface";
import { EpaycoPaymentProvider } from "./epayco/epayco-payment.provider";
import { MercadoPagoPaymentProvider } from "./mercadopago/mercadopago-payment.provider";
import { FakePaymentProvider } from "./fake/fake-payment.provider";

/**
 * Selección del adaptador de pagos según el entorno (ADR-006):
 * - Test: FakePaymentProvider (replica la pasarela sin red, firma incluida)
 * - PAYMENT_PROVIDER=mercadopago → MercadoPago (pasarela principal; requiere
 *   MERCADOPAGO_ACCESS_TOKEN de modo prueba/test para cobrar de verdad)
 * - PAYMENT_PROVIDER=epayco o vacío → ePayco
 */
export function createPaymentProvider(): PaymentProvider {
  if (process.env.NODE_ENV === "test") {
    return new FakePaymentProvider();
  }
  const activo = (process.env.PAYMENT_PROVIDER ?? "epayco").toLowerCase();
  if (activo === "mercadopago") {
    return new MercadoPagoPaymentProvider();
  }
  return new EpaycoPaymentProvider();
}
