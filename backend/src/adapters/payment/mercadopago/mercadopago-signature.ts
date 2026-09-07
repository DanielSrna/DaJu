import { createHmac, timingSafeEqual } from "crypto";

/**
 * Validación de firma de webhooks v1 de MercadoPago (IPN).
 * Documentado en github.com/mercadopago/webhooks:
 *   hash = SHA256( secret + x_request_id + manifest + resource_id )
 *   si hash == x_signature → auténtico.
 */
export function verifyMercadoPagoSignature(datos: {
  secret: string;
  xRequestId?: string;
  manifest?: string;
  resourceId?: string;
  xSignature?: string;
}): boolean {
  const { secret, xRequestId, manifest, resourceId, xSignature } = datos;
  if (!xSignature) return false;
  const base = `${secret}\n${xRequestId ?? ""}\n${manifest ?? ""}\n${resourceId ?? ""}`;
  const calculado = createHmac("sha256", base)
    .digest("hex")
    .trim()
    .toLowerCase();
  const recibido = xSignature.trim().toLowerCase();
  const a = Buffer.from(calculado);
  const b = Buffer.from(recibido);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
