/**
 * Contrato de correo. Las notificaciones (gatillo de estados) dependen de esta
 * interfaz, NUNCA de Nodemailer directamente.
 *
 * Implementaciones: NodemailerEmailProvider (adapter) — por implementar.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}
