import { EmailProvider, EmailMessage } from "../email-provider.interface";

/**
 * Correo simulado para entorno de TEST: registra los mensajes en memoria
 * en vez de enviarlos por SMTP.
 */
export class FakeEmailProvider implements EmailProvider {
  readonly enviados: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.enviados.push(message);
  }
}
