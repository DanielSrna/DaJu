import { PaymentProvider } from "./payment-provider.interface";
import { EpaycoPaymentProvider } from "./epayco/epayco-payment.provider";
import { FakePaymentProvider } from "./fake/fake-payment.provider";

/**
 * Selección del adaptador de pagos según el entorno.
 * - Test: FakePaymentProvider (replica ePayco sin red, firma incluida)
 * - Producción/desarrollo: EpaycoPaymentProvider
 * Si se cambia de pasarela (ADR-005), esta factory decide sin tocar el resto.
 */
export function createPaymentProvider(): PaymentProvider {
  if (process.env.NODE_ENV === "test") {
    return new FakePaymentProvider();
  }
  return new EpaycoPaymentProvider();
}
