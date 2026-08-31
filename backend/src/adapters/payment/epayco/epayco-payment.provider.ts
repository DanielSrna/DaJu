import { env } from "../../../config/env";
import { ApiError } from "../../../utils/ApiError";
import { PaymentProvider, PaymentResult } from "../payment-provider.interface";
import { verifyEpaycoSignature } from "./epayco-signature";
import { logger } from "../../../config/logger";

interface EpaycoWebhookPayload {
  x_cust_id_cliente?: string;
  x_ref_payco?: string;
  x_transaction_id?: string;
  x_amount?: string;
  x_currency_code?: string;
  x_transaction_state?: string;
  x_signature?: string;
  x_franchise?: string;
  [key: string]: unknown;
}

/**
 * Adaptador de ePayco (pasarela colombiana).
 * Implementa el contrato PaymentProvider. Ver ADR-005.
 *
 * NOTA: las credenciales aún están en validación por ePayco.
 * El flujo está cubierto por tests con un proveedor simulado; al activar las
 * llaves reales solo se hace la prueba de humo en producción.
 */
export class EpaycoPaymentProvider implements PaymentProvider {
  private readonly apiBase = "https://api.epayco.co";

  private assertConfigured(): void {
    if (!env.EPAYCO_PUBLIC_KEY || !env.EPAYCO_PRIVATE_KEY) {
      throw ApiError.internal(
        "ePayco no está configurado (EPAYCO_PUBLIC_KEY / EPAYCO_PRIVATE_KEY)",
      );
    }
  }

  async createCheckout(params: {
    amount: number;
    currency: string;
    description: string;
    clientEmail: string;
    metadata: Record<string, string>;
  }): Promise<PaymentResult> {
    this.assertConfigured();
    logger.proceso("EpaycoPaymentProvider.createCheckout", {
      email: params.clientEmail,
    });

    const body = {
      public_key: env.EPAYCO_PUBLIC_KEY,
      txn: {
        amount: params.amount.toFixed(2),
        currency: params.currency,
        description: params.description,
        email: params.clientEmail,
        url_confirmacion: env.EPAYCO_WEBHOOK_URL,
        url_response: env.APP_URL,
        extra1: params.metadata.paqueteSlug ?? "",
        extra2: params.metadata.pagoId ?? "",
      },
    };

    try {
      const response = await fetch(`${this.apiBase}/payment/v1/charge/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        success?: boolean;
        data?: { ref_payco?: string; url_aprobar?: string; response?: string };
      };

      if (!response.ok || !data.success) {
        logger.fracaso(
          "EpaycoPaymentProvider.createCheckout rechazado por ePayco",
          {
            status: response.status,
            respuesta: data.data?.response ?? "sin respuesta",
          },
        );
        throw ApiError.internal("No se pudo crear la transacción en ePayco");
      }

      logger.exito("EpaycoPaymentProvider.createCheckout completado", {
        refPayco: data.data?.ref_payco,
      });
      return {
        paymentId: data.data?.ref_payco ?? "",
        status: "pending",
        checkoutUrl: data.data?.url_aprobar ?? null,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.fracaso("EpaycoPaymentProvider.createCheckout falló por red", {
        error: (error as Error).message,
      });
      throw ApiError.internal("No se pudo contactar a ePayco");
    }
  }

  async handleWebhook(body: Record<string, unknown>): Promise<{
    eventType: string;
    paymentId: string;
    status: PaymentResult["status"];
  }> {
    const payload = body as EpaycoWebhookPayload;

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
      logger.fracaso("EpaycoPaymentProvider.handleWebhook: firma inválida", {
        refPayco: payload.x_ref_payco,
      });
      throw ApiError.unauthorized("Firma de webhook inválida");
    }

    const estado = payload.x_transaction_state ?? "";
    const status: PaymentResult["status"] =
      estado === "Aceptada"
        ? "paid"
        : estado === "Rechazada"
          ? "failed"
          : "pending";

    logger.exito("EpaycoPaymentProvider.handleWebhook procesado", {
      refPayco: payload.x_ref_payco,
      estado,
      status,
    });

    return {
      eventType: `payment.${status}`,
      paymentId: payload.x_ref_payco ?? "",
      status,
    };
  }
}
