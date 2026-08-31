import nodemailer from "nodemailer";
import { env } from "../../../config/env";
import { ApiError } from "../../../utils/ApiError";
import { EmailProvider, EmailMessage } from "../email-provider.interface";
import { logger } from "../../../config/logger";

/**
 * Adaptador de correo con Gmail SMTP (app password).
 * Usado por el formulario de contacto y, en el futuro, las notificaciones
 * de la plataforma (Fase 6).
 */
export class NodemailerEmailProvider implements EmailProvider {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_APP_PASSWORD,
      },
    });
  }

  private assertConfigured(): void {
    if (!env.EMAIL_USER || !env.EMAIL_APP_PASSWORD) {
      throw ApiError.internal(
        "Correo no configurado (EMAIL_USER / EMAIL_APP_PASSWORD)",
      );
    }
  }

  async send(message: EmailMessage): Promise<void> {
    this.assertConfigured();
    logger.proceso("NodemailerEmailProvider.send", {
      to: message.to,
      subject: message.subject,
    });

    try {
      await this.transporter.sendMail({
        from: message.from ?? `MainPlataform <${env.EMAIL_USER}>`,
        to: message.to,
        subject: message.subject,
        html: message.html,
      });
      logger.exito("NodemailerEmailProvider.send completado", {
        to: message.to,
      });
    } catch (error) {
      logger.fracaso("NodemailerEmailProvider.send falló", {
        to: message.to,
        error: (error as Error).message,
      });
      throw ApiError.internal("No se pudo enviar el correo");
    }
  }
}
