import { ContactoModel } from "../models/contacto.model";
import { EmailProvider } from "../adapters/email/email-provider.interface";
import { createEmailProvider } from "../adapters/email/email-provider.factory";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

interface ContactoInput {
  nombre: string;
  email: string;
  asunto?: string;
  mensaje: string;
}

interface ContactoJson {
  id: string;
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  estado: string;
  enviadoAdmin: boolean;
  acuseEnviado: boolean;
  createdAt: Date;
}

/**
 * Formulario de contacto de la vitrina.
 * Guarda el mensaje, lo envía al correo del admin (oculto para el usuario)
 * y responde con un acuse automático.
 */
export class ContactoService {
  constructor(private readonly email: EmailProvider = createEmailProvider()) {}

  async enviar(data: ContactoInput): Promise<ContactoJson> {
    logger.proceso("ContactoService.enviar", { email: data.email });

    if (!env.CONTACT_EMAIL) {
      logger.fracaso("ContactoService.enviar: CONTACT_EMAIL no configurada");
      throw ApiError.internal("Correo de contacto no configurado");
    }

    const doc = await ContactoModel.create({
      nombre: data.nombre.trim(),
      email: data.email.trim().toLowerCase(),
      asunto: data.asunto?.trim() ?? "",
      mensaje: data.mensaje.trim(),
    });

    const htmlMensaje = `
      <h2>Nuevo mensaje de contacto</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(data.nombre)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
      ${data.asunto ? `<p><strong>Asunto:</strong> ${escapeHtml(data.asunto)}</p>` : ""}
      <p><strong>Mensaje:</strong></p>
      <blockquote style="white-space: pre-wrap">${escapeHtml(data.mensaje)}</blockquote>
    `;

    await this.email.send({
      to: env.CONTACT_EMAIL,
      subject: `[Contacto] ${data.asunto || "Nuevo mensaje"} — ${data.nombre}`,
      html: htmlMensaje,
    });
    doc.enviadoAdmin = true;

    await this.email.send({
      to: data.email,
      subject: "Recibimos tu mensaje — MainPlataform",
      html: `
        <h2>¡Hola, ${escapeHtml(data.nombre)}!</h2>
        <p>Recibimos tu mensaje y te responderemos muy pronto.</p>
        <p>Te confirmamos que llegó correctamente:</p>
        <blockquote style="white-space: pre-wrap">${escapeHtml(data.mensaje)}</blockquote>
        <p>— Equipo MainPlataform</p>
      `,
    });
    doc.acuseEnviado = true;

    await doc.save();

    logger.exito("ContactoService.enviar completado", {
      contactoId: String(doc._id),
      email: data.email,
    });
    return toJson(doc.toObject());
  }

  async listar(
    pagina: number,
    limite: number,
  ): Promise<{
    mensajes: ContactoJson[];
    total: number;
    pagina: number;
    totalPaginas: number;
  }> {
    logger.proceso("ContactoService.listar");

    const limiteSeguro = Math.min(Math.max(limite, 1), 100);
    const paginaSegura = Math.max(pagina, 1);
    const [docs, total] = await Promise.all([
      ContactoModel.find()
        .sort({ createdAt: -1 })
        .skip((paginaSegura - 1) * limiteSeguro)
        .limit(limiteSeguro)
        .lean(),
      ContactoModel.countDocuments(),
    ]);

    return {
      mensajes: docs.map((d) => toJson(d)),
      total,
      pagina: paginaSegura,
      totalPaginas: Math.ceil(total / limiteSeguro),
    };
  }
}

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toJson(doc: Record<string, unknown>): ContactoJson {
  return {
    id: String(doc._id),
    nombre: String(doc.nombre),
    email: String(doc.email),
    asunto: String(doc.asunto ?? ""),
    mensaje: String(doc.mensaje),
    estado: String(doc.estado),
    enviadoAdmin: Boolean(doc.enviadoAdmin),
    acuseEnviado: Boolean(doc.acuseEnviado),
    createdAt: new Date(doc.createdAt as string),
  };
}

export const contactoService = new ContactoService();
