/**
 * Contrato de pagos. Todo el flujo de checkout depende de esta interfaz,
 * NUNCA de Stripe directamente (ver ADR-001 / Principios de Arquitectura).
 *
 * Implementaciones: StripePaymentProvider (adapter) — por implementar.
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
  handleWebhook(
    rawBody: string,
    signature: string,
  ): Promise<{
    eventType: string;
    paymentId: string;
    status: PaymentResult["status"];
  }>;
}
