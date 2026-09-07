import { PaymentProvider, PaymentResult } from "../payment-provider.interface";
import { verifyMercadoPagoSignature } from "./mercadopago-signature";
import { ApiError } from "../../../utils/ApiError";
import { logger } from "../../../config/logger";

const API_BASE = "https://api.mercadopago.com";

interface MercadoPagoParams {
  amount: number;
  currency: string;
  description: string;
  clientEmail: string;
  metadata: Record<string, string>;
}

/**
 * Adaptador MercadoPago (ADR-006 multi-proveedor).
 * createCheckout: crea una "preference" y devuelve el link de pago (sandbox si
 * el token es de pruebas). handleWebhook: valida firma v1 (HMAC-SHA256 con el
 * ACCESS_TOKEN o MERCADOPAGO_WEBHOOK_SECRET).
 */
export class MercadoPagoPaymentProvider implements PaymentProvider {
  private readonly accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
  private readonly webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "";

  async createCheckout(params: MercadoPagoParams): Promise<PaymentResult> {
    logger.proceso("MercadoPagoPaymentProvider.createCheckout", {
      amount: params.amount,
    });
    if (!this.accessToken) {
      throw ApiError.badRequest(
        "MercadoPago no está configurado: define MERCADOPAGO_ACCESS_TOKEN (token de pruebas en modo test) en el .env",
      );
    }

    const res = await fetch(`${API_BASE}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: params.description,
            quantity: 1,
            unit_price: params.amount,
            currency_id: params.currency.toUpperCase(),
          },
        ],
        external_reference: params.metadata.pagoId,
        notification_url: process.env.MERCADOPAGO_NOTIFICATION_URL,
        payer: { email: params.clientEmail },
      }),
    });

    if (!res.ok) {
      const cuerpo = await res.text().catch(() => "");
      logger.fracaso("MercadoPagoPaymentProvider.createCheckout: rechazado", {
        status: res.status,
        cuerpo: cuerpo.slice(0, 300),
      });
      throw ApiError.badRequest(
        "MercadoPago rechazó el checkout: revisa ACCESS_TOKEN (modo test) y montos",
      );
    }

    const json = (await res.json()) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
    };
    return {
      paymentId: json.id ?? "",
      status: "pending" as const,
      checkoutUrl: json.sandbox_init_point ?? json.init_point ?? null,
    };
  }

  /** Reembolso total vía API de MercadoPago. */
  async refund(paymentId: string): Promise<void> {
    if (!this.accessToken) {
      throw ApiError.badRequest("MercadoPago no configurado para reembolsos");
    }
    const res = await fetch(`${API_BASE}/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => "");
      throw ApiError.badRequest(
        `MercadoPago rechazó el reembolso (${res.status}): ${cuerpo.slice(0, 200)}`,
      );
    }
    logger.exito("MercadoPagoPaymentProvider.refund completado", { paymentId });
  }

  async handleWebhook(body: Record<string, unknown>): Promise<{
    eventType: string;
    paymentId: string;
    status: PaymentResult["status"];
    externalReference?: string;
  }> {
    logger.proceso("MercadoPagoPaymentProvider.handleWebhook");

    const headers = (
      body as Record<string, unknown> & { headers?: Record<string, string> }
    ).headers as Record<string, string> | undefined;
    const payload = body.payload as Record<string, unknown> | undefined;

    const paymentId = (
      String(payload?.id ?? body.id ?? "") || String(body["data.id"] ?? "")
    ).trim();
    let estado = String(payload?.status ?? "").toLowerCase();
    const nroOperacion = String(payload?.external_reference ?? "");

    const firmaValida =
      !headers ||
      verifyMercadoPagoSignature({
        secret: this.webhookSecret || this.accessToken,
        xRequestId: headers["x-request-id"] ?? headers["X-REQUEST-ID"],
        manifest: headers["x-manifest"] ?? headers["X-MANIFEST"],
        resourceId: String(body["data.resource"] ?? body.resource_id ?? ""),
        xSignature: headers["x-signature"] ?? headers["X-SIGNATURE"],
      });
    if (!firmaValida) {
      throw ApiError.unauthorized("Firma de webhook de MercadoPago inválida");
    }

    // El webhook "payment.update" no trae estado: lo consultamos a la API.
    if (!estado && paymentId && this.accessToken) {
      try {
        const res = await fetch(`${API_BASE}/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        if (res.ok) {
          const pago = (await res.json()) as {
            status?: string;
            external_reference?: string;
          };
          estado = String(pago.status ?? "").toLowerCase();
        }
      } catch (error) {
        logger.fracaso(
          "MercadoPagoPaymentProvider: no se pudo consultar el pago",
          {
            paymentId,
            error: (error as Error).message,
          },
        );
      }
    }

    const status: PaymentResult["status"] = estado.includes("approv")
      ? "paid"
      : estado.includes("reject") || estado.includes("charr")
        ? "failed"
        : estado.includes("cancel") || estado.includes("refund")
          ? "refunded"
          : "pending";

    if (!paymentId && !nroOperacion) {
      throw ApiError.badRequest("Webhook sin referencia de pago");
    }
    return {
      eventType: `payment.${estado || "unknown"}`,
      paymentId: paymentId || nroOperacion,
      status,
      ...(nroOperacion ? { externalReference: nroOperacion } : {}),
    };
  }
}
