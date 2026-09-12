import { PaymentProvider, PaymentResult } from "../payment-provider.interface";
import { ApiError } from "../../../utils/ApiError";
import { logger } from "../../../config/logger";

/**
 * Adaptador PayPal (Orders API v2).
 * - createCheckout: crea la orden y devuelve el link de aprobación.
 * - capture: captura la orden aprobada (al volver del checkout o por webhook).
 * - handleWebhook: valida la firma con /v1/notifications/verify-webhook-signature
 *   y normaliza a los estados internos.
 */
export class PaypalPaymentProvider implements PaymentProvider {
  private readonly clientId = process.env.PAYPAL_CLIENT_ID ?? "";
  private readonly clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? "";
  private readonly webhookId = process.env.PAYPAL_WEBHOOK_ID ?? "";
  private readonly baseUrl =
    (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase() === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  private tokenCache: { token: string; expira: number } | null = null;

  /** Token OAuth2 con caché en memoria (válido ~9h). */
  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expira > Date.now()) {
      return this.tokenCache.token;
    }
    if (!this.clientId || !this.clientSecret) {
      throw ApiError.badRequest(
        "PayPal no está configurado: define PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en el .env",
      );
    }
    const credenciales = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString("base64");
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credenciales}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => "");
      logger.fracaso("PaypalPaymentProvider.getAccessToken: rechazado", {
        status: res.status,
        cuerpo: cuerpo.slice(0, 200),
      });
      throw ApiError.badRequest(
        "PayPal rechazó las credenciales (revisa PAYPAL_CLIENT_ID/SECRET)",
      );
    }
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    const token = json.access_token ?? "";
    this.tokenCache = {
      token,
      expira: Date.now() + (json.expires_in ?? 3000) * 1000 - 60_000,
    };
    return token;
  }

  async createCheckout(params: {
    amount: number;
    currency: string;
    description: string;
    clientEmail: string;
    metadata: Record<string, string>;
  }): Promise<PaymentResult> {
    logger.proceso("PaypalPaymentProvider.createCheckout", {
      amount: params.amount,
    });
    const token = await this.getAccessToken();
    const frontend = process.env.FRONTEND_URL ?? "";
    const returnUrl = frontend
      ? `${frontend}/cliente/pagar/${params.metadata.pagoId}?paypal=ok`
      : process.env.PAYPAL_RETURN_URL;
    const cancelUrl = frontend
      ? `${frontend}/cliente/pagar/${params.metadata.pagoId}?paypal=cancel`
      : process.env.PAYPAL_CANCEL_URL;

    const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: params.currency.toUpperCase(),
              value: params.amount.toFixed(2),
            },
            description: params.description,
            custom_id: params.metadata.pagoId,
            reference_id: params.metadata.pagoId,
          },
        ],
        application_context: {
          brand_name: "DaJu Plataform",
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });

    if (!res.ok) {
      const cuerpo = await res.text().catch(() => "");
      logger.fracaso("PaypalPaymentProvider.createCheckout: rechazado", {
        status: res.status,
        cuerpo: cuerpo.slice(0, 300),
      });
      throw ApiError.badRequest(
        "PayPal rechazó el checkout: revisa credenciales y montos",
      );
    }

    const json = (await res.json()) as {
      id?: string;
      links?: Array<{ rel?: string; href?: string }>;
    };
    const aprobacion = json.links?.find((l) => l.rel === "approve");
    logger.exito("PaypalPaymentProvider.createCheckout completado", {
      orderId: json.id,
    });
    return {
      paymentId: json.id ?? "",
      status: "pending",
      checkoutUrl: aprobacion?.href ?? null,
    };
  }

  /** Captura la orden aprobada. Devuelve el id de la captura. */
  async capture(paymentId: string): Promise<PaymentResult> {
    logger.proceso("PaypalPaymentProvider.capture", { paymentId });
    const token = await this.getAccessToken();
    const res = await fetch(
      `${this.baseUrl}/v2/checkout/orders/${paymentId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => "");
      logger.fracaso("PaypalPaymentProvider.capture: rechazado", {
        status: res.status,
        cuerpo: cuerpo.slice(0, 300),
      });
      throw ApiError.badRequest(
        "PayPal rechazó la captura del pago (¿ya fue capturado?)",
      );
    }
    const json = (await res.json()) as {
      status?: string;
      purchase_units?: Array<{
        payments?: { captures?: Array<{ id?: string; status?: string }> };
      }>;
    };
    const captura = json.purchase_units?.[0]?.payments?.captures?.[0];
    const completada =
      json.status === "COMPLETED" || captura?.status === "COMPLETED";
    logger.exito("PaypalPaymentProvider.capture completado", {
      captureId: captura?.id,
      completada,
    });
    return {
      paymentId: captura?.id ?? paymentId,
      status: completada ? "paid" : "pending",
      checkoutUrl: null,
    };
  }

  /** Reembolso total de una captura. */
  async refund(paymentId: string): Promise<void> {
    logger.proceso("PaypalPaymentProvider.refund", { paymentId });
    const token = await this.getAccessToken();
    const res = await fetch(
      `${this.baseUrl}/v2/payments/captures/${paymentId}/refunds`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
    if (!res.ok) {
      const cuerpo = await res.text().catch(() => "");
      throw ApiError.badRequest(
        `PayPal rechazó el reembolso (${res.status}): ${cuerpo.slice(0, 200)}`,
      );
    }
    logger.exito("PaypalPaymentProvider.refund completado", { paymentId });
  }

  async handleWebhook(body: Record<string, unknown>): Promise<{
    eventType: string;
    paymentId: string;
    status: PaymentResult["status"];
    externalReference?: string;
  }> {
    logger.proceso("PaypalPaymentProvider.handleWebhook");

    const headers = (
      body as Record<string, unknown> & { headers?: Record<string, string> }
    ).headers as Record<string, string> | undefined;
    const resource = (body.resource ?? {}) as Record<string, unknown>;
    const eventType = String(body.event_type ?? "unknown");

    // Sin webhook id no hay forma de validar la firma: se rechaza el evento.
    if (!this.webhookId) {
      logger.fracaso(
        "PaypalPaymentProvider.handleWebhook: PAYPAL_WEBHOOK_ID sin configurar",
        {},
      );
      throw ApiError.badRequest(
        "PayPal no está configurado para webhooks (define PAYPAL_WEBHOOK_ID)",
      );
    }
    const valida = await this.verificarFirma(headers ?? {}, body);
    if (!valida) {
      throw ApiError.unauthorized("Firma de webhook de PayPal inválida");
    }

    const estado = String(resource.status ?? "").toUpperCase();
    const status: PaymentResult["status"] = eventType.includes(
      "CAPTURE.COMPLETED",
    )
      ? "paid"
      : eventType.includes("DENIED") || eventType.includes("FAILED")
        ? "failed"
        : eventType.includes("REFUND") || eventType.includes("REVERSED")
          ? "refunded"
          : estado === "COMPLETED"
            ? "paid"
            : "pending";

    const paymentId = String(resource.id ?? "");
    const pagoId = String(resource.custom_id ?? "");
    if (!paymentId && !pagoId) {
      throw ApiError.badRequest("Webhook sin referencia de pago");
    }
    logger.exito("PaypalPaymentProvider.handleWebhook completado", {
      eventType,
      status,
    });
    return {
      eventType,
      paymentId: paymentId || pagoId,
      status,
      ...(pagoId ? { externalReference: pagoId } : {}),
    };
  }

  private async verificarFirma(
    headers: Record<string, string>,
    body: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(
        `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transmission_id:
              headers["paypal-transmission-id"] ??
              headers["PAYPAL-TRANSMISSION-ID"],
            transmission_time:
              headers["paypal-transmission-time"] ??
              headers["PAYPAL-TRANSMISSION-TIME"],
            cert_url: headers["paypal-cert-url"] ?? headers["PAYPAL-CERT-URL"],
            auth_algo:
              headers["paypal-auth-algo"] ?? headers["PAYPAL-AUTH-ALGO"],
            transmission_sig:
              headers["paypal-transmission-sig"] ??
              headers["PAYPAL-TRANSMISSION-SIG"],
            webhook_id: this.webhookId,
            webhook_event: body,
          }),
        },
      );
      if (!res.ok) return false;
      const json = (await res.json()) as { verification_status?: string };
      return json.verification_status === "SUCCESS";
    } catch (error) {
      logger.fracaso("PaypalPaymentProvider.verificarFirma falló", {
        error: (error as Error).message,
      });
      return false;
    }
  }
}
