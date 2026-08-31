import { randomUUID } from "crypto";
import { env } from "../../../config/env";
import { ApiError } from "../../../utils/ApiError";
import { PaymentProvider, PaymentResult } from "../payment-provider.interface";
import { verifyEpaycoSignature } from "../epayco/epayco-signature";

/**
 * Proveedor simulado para entorno de TEST.
 * Replica EXACTAMENTE el comportamiento de ePayco: misma firma MD5, mismos
 * estados (Aceptada/Rechazada), pero sin red. La factory lo usa cuando
 * NODE_ENV=test; en producción se usa EpaycoPaymentProvider.
 */
export class FakePaymentProvider implements PaymentProvider {
  async createCheckout(_params: {
    amount: number;
    currency: string;
    description: string;
    clientEmail: string;
    metadata: Record<string, string>;
  }): Promise<PaymentResult> {
    return {
      paymentId: `fake-ref-${randomUUID().slice(0, 8)}`,
      status: "pending",
      checkoutUrl: "https://checkout.epayco.test/pagar",
    };
  }

  async handleWebhook(body: Record<string, unknown>): Promise<{
    eventType: string;
    paymentId: string;
    status: PaymentResult["status"];
  }> {
    const payload = body as Record<string, string | undefined>;

    const signatureOk = verifyEpaycoSignature(
      env.EPAYCO_PRIVATE_KEY,
      payload.x_signature,
      {
        custIdCliente: payload.x_cust_id_cliente ?? "",
        refPayco: payload.x_ref_payco ?? "",
        transactionId: payload.x_transaction_id ?? "",
        amount: payload.x_amount ?? "",
        currency: payload.x_currency_code ?? "",
      },
    );

    if (!signatureOk) {
      throw ApiError.unauthorized("Firma de webhook inválida");
    }

    const estado = payload.x_transaction_state ?? "";
    const status: PaymentResult["status"] =
      estado === "Aceptada"
        ? "paid"
        : estado === "Rechazada"
          ? "failed"
          : "pending";

    return {
      eventType: `payment.${status}`,
      paymentId: payload.x_ref_payco ?? "",
      status,
    };
  }
}
