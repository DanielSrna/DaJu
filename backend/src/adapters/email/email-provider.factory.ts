import { EmailProvider } from "./email-provider.interface";
import { NodemailerEmailProvider } from "./nodemailer/nodemailer-email.provider";
import { FakeEmailProvider } from "./fake/fake-email.provider";

/**
 * Selección del adaptador de correo según el entorno.
 * - Test: FakeEmailProvider (en memoria)
 * - Producción/desarrollo: NodemailerEmailProvider (Gmail SMTP)
 */
export function createEmailProvider(): EmailProvider {
  if (process.env.NODE_ENV === "test") {
    return new FakeEmailProvider();
  }
  return new NodemailerEmailProvider();
}
