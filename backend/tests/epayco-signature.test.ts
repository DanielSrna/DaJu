import { buildEpaycoSignature, verifyEpaycoSignature } from "../src/adapters/payment/epayco/epayco-signature";

describe("Firma MD5 ePayco", () => {
  const privateKey = "abc123private";
  const fields = {
    custIdCliente: "100000000",
    refPayco: "8001",
    transactionId: "100000",
    amount: "199000",
    currency: "COP",
  };

  it("genera la firma esperada (md5 de los campos unidos con ~)", () => {
    const firma = buildEpaycoSignature(privateKey, fields);
    expect(firma).toMatch(/^[a-f0-9]{32}$/);
  });

  it("verifica una firma correcta", () => {
    const firma = buildEpaycoSignature(privateKey, fields);
    expect(verifyEpaycoSignature(privateKey, firma, fields)).toBe(true);
  });

  it("rechaza una firma incorrecta", () => {
    expect(verifyEpaycoSignature(privateKey, "firma-invalida", fields)).toBe(false);
  });

  it("rechaza si la firma no viene", () => {
    expect(verifyEpaycoSignature(privateKey, undefined, fields)).toBe(false);
  });

  it("no verifica si la llave cambia", () => {
    const firma = buildEpaycoSignature(privateKey, fields);
    expect(verifyEpaycoSignature("otra-llave", firma, fields)).toBe(false);
  });
});
