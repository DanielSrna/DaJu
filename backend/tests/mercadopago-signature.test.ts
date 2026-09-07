import { verifyMercadoPagoSignature } from "../src/adapters/payment/mercadopago/mercadopago-signature";

describe("Firma de webhooks de MercadoPago", () => {
  const secret = "APP_USR-1234567890";
  const xRequestId = "req-1";
  const manifest = "manifest-abc";
  const resourceId = "payment-42";

  it("acepta una firma calculada con el algoritmo documentado", () => {
    // Mismo algoritmo que la utilidad: HMAC-SHA256 sobre base con \n.
    const crypto = require("crypto");
    const base = `${secret}\n${xRequestId}\n${manifest}\n${resourceId}`;
    const correcta = crypto.createHmac("sha256", base).digest("hex");

    const ok = verifyMercadoPagoSignature({
      secret,
      xRequestId,
      manifest,
      resourceId,
      xSignature: correcta,
    });
    expect(ok).toBe(true);
  });

  it("rechaza firmas inválidas o ausentes", () => {
    const incorrecta = verifyMercadoPagoSignature({
      secret,
      xRequestId,
      manifest,
      resourceId,
      xSignature: "firma-falsa",
    });
    expect(incorrecta).toBe(false);

    const ausente = verifyMercadoPagoSignature({ secret, manifest });
    expect(ausente).toBe(false);
  });
});
