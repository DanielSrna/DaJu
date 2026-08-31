import { createHash } from "crypto";

/**
 * Firma MD5 de ePayco:
 * md5( llave_privada ~ x_cust_id_cliente ~ x_ref_payco ~ x_transaction_id ~ x_amount ~ x_currency_code )
 */
export function buildEpaycoSignature(
  privateKey: string,
  fields: {
    custIdCliente: string;
    refPayco: string;
    transactionId: string;
    amount: string;
    currency: string;
  },
): string {
  const raw = [
    privateKey,
    fields.custIdCliente,
    fields.refPayco,
    fields.transactionId,
    fields.amount,
    fields.currency,
  ].join("~");
  return createHash("md5").update(raw).digest("hex");
}

export function verifyEpaycoSignature(
  privateKey: string,
  received: string | undefined,
  fields: {
    custIdCliente: string;
    refPayco: string;
    transactionId: string;
    amount: string;
    currency: string;
  },
): boolean {
  if (!received) return false;
  return buildEpaycoSignature(privateKey, fields) === received.toLowerCase();
}
