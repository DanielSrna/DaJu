/**
 * Contrato de pagos. Todo el flujo de checkout depende de esta interfaz,
 * NUNCA de la pasarela directamente (ver ADR-001 / Principios de Arquitectura).
 *
 * Implementaciones: EpaycoPaymentProvider (ePayco, ver ADR-005).
 */
export interface PaymentResult {
  paymentId: string;
  status: "pending" | "paid" | "failed" | "refunded";
  checkoutUrl: string | null;
}

export interface PaymentProvider {
  createCheckout(params: {
    amount: number;
    currency: string;
    description: string;
    clientEmail: string;
    metadata: Record<string, string>;
  }): Promise<PaymentResult>;
  handleWebhook(body: Record<string, unknown>): Promise<{
    eventType: string;
    paymentId: string;
    status: PaymentResult["status"];
  }>;
}
