import { EmailProvider } from "../adapters/email/email-provider.interface";
import { createEmailProvider } from "../adapters/email/email-provider.factory";
import { logger } from "../config/logger";

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatearFecha(fecha: Date): string {
  return `${fecha.getUTCDate()}/${fecha.getUTCMonth() + 1}/${fecha.getUTCFullYear()}`;
}

interface NotificacionDatos {
  clienteEmail: string;
  clienteNombre: string;
  proyectoNombre?: string;
  estado?: string;
  fechaEntrega?: Date;
}

/**
 * Gatillo de notificaciones (Nodemailer): avisos automáticos al cliente
 * por cada hito: compra confirmada, credenciales, avance de estado y entrega.
 */
export class NotificacionesService {
  constructor(private readonly email: EmailProvider = createEmailProvider()) {}

  /** Onboarding: credenciales del cliente tras el pago confirmado. */
  async enviarCredenciales(data: {
    email: string;
    passwordTemporal: string;
  }): Promise<void> {
    logger.proceso("NotificacionesService.enviarCredenciales", {
      email: data.email,
    });
    await this.email.send({
      to: data.email,
      subject: "Tus credenciales de acceso — MainPlataform",
      html: `
        <h2>¡Bienvenido a MainPlataform!</h2>
        <p>Tu compra fue confirmada y creamos tu cuenta de cliente.</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Contraseña temporal:</strong> ${escapeHtml(data.passwordTemporal)}</p>
        <p>Te recomendamos cambiar la contraseña en tu primer acceso.</p>
        <p>— Equipo MainPlataform</p>
      `,
    });
    logger.exito("NotificacionesService.enviarCredenciales completado", {
      email: data.email,
    });
  }

  /** Compra confirmada: pago aceptado y proyecto creado. */
  async enviarCompraConfirmada(data: {
    email: string;
    nombreCliente: string;
    producto: string;
    detalle: string;
    fechaEntrega: Date | null;
  }): Promise<void> {
    logger.proceso("NotificacionesService.enviarCompraConfirmada", {
      email: data.email,
    });
    await this.email.send({
      to: data.email,
      subject: "¡Pago confirmado! Tu compra está en curso — MainPlataform",
      html: `
        <h2>¡Gracias, ${escapeHtml(data.nombreCliente)}!</h2>
        <p>Tu pago fue <strong>confirmado</strong>.</p>
        <p><strong>Producto:</strong> ${escapeHtml(data.producto)}</p>
        ${data.fechaEntrega ? `<p><strong>Fecha estimada de entrega:</strong> ${formatearFecha(data.fechaEntrega)}</p>` : ""}
        <p>${escapeHtml(data.detalle)}</p>
        <p>— Equipo MainPlataform</p>
      `,
    });
    logger.exito("NotificacionesService.enviarCompraConfirmada completado", {
      email: data.email,
    });
  }

  /** Cita confirmada: llega al cliente con la franja y el link. */
  async enviarCitaConfirmada(data: {
    email: string;
    cliente: string;
    sesion: number;
    fecha: string;
    canal: string;
    linkVideollamada: string;
  }): Promise<void> {
    logger.proceso("NotificacionesService.enviarCitaConfirmada", {
      email: data.email,
    });
    await this.email.send({
      to: data.email,
      subject: `Cita confirmada · Sesión ${data.sesion} — MainPlataform`,
      html: `
        <h2>¡Gracias, ${escapeHtml(data.cliente)}!</h2>
        <p>Tu sesión <strong>${data.sesion}</strong> quedó <strong>confirmada</strong>:</p>
        <p><strong>Fecha:</strong> ${escapeHtml(data.fecha)}</p>
        <p><strong>Canal:</strong> ${escapeHtml(data.canal)}</p>
        ${data.linkVideollamada ? `<p><a href="${escapeHtml(data.linkVideollamada)}">Unirse a la videollamada</a></p>` : "<p>Recibirás el enlace de la videollamada en tu espacio de consultoría.</p>"}
        <p>— Equipo MainPlataform</p>
      `,
    });
    logger.exito("NotificacionesService.enviarCitaConfirmada completado");
  }

  /** Cotización respondida: el cliente sabe que hay presupuesto por aceptar. */
  async enviarCotizacionRespondida(data: {
    email: string;
    cliente: string;
    titulo: string;
    costo: number;
    respuesta: string;
  }): Promise<void> {
    logger.proceso("NotificacionesService.enviarCotizacionRespondida", {
      email: data.email,
    });
    await this.email.send({
      to: data.email,
      subject: `Cotización de "${data.titulo}" — MainPlataform`,
      html: `
        <h2>¡Hola, ${escapeHtml(data.cliente)}!</h2>
        <p>El equipo respondió tu solicitud <strong>${escapeHtml(data.titulo)}</strong>:</p>
        <p><strong>Presupuesto:</strong> $${data.costo} USD</p>
        <p>${escapeHtml(data.respuesta)}</p>
        <p>Entra a tu portal para <strong>aceptar y pagar</strong> cuando quieras.</p>
        <p>— Equipo MainPlataform</p>
      `,
    });
    logger.exito("NotificacionesService.enviarCotizacionRespondida completado");
  }

  /** Restablecer contraseña: enlace temporal de 30 minutos. */
  async enviarRestablecer(data: {
    email: string;
    token: string;
  }): Promise<void> {
    logger.proceso("NotificacionesService.enviarRestablecer", {
      email: data.email,
    });
    const base = process.env.FRONTEND_URL ?? "http://localhost:5173";
    const url = `${base}/cliente/restablecer?token=${data.token}`;
    await this.email.send({
      to: data.email,
      subject: "Restablece tu contraseña — MainPlataform",
      html: `
        <h2>Restablece tu contraseña</h2>
        <p>Recibimos tu solicitud. Este enlace es válido por <strong>30 minutos</strong>:</p>
        <p><a href="${url}">${url}</a></p>
        <p>Si no fuiste tú, ignora este correo.</p>
        <p>— Equipo MainPlataform</p>
      `,
    });
    logger.exito("NotificacionesService.enviarRestablecer completado");
  }

  /** Monitor de progreso: aviso por cada cambio de estado. */
  async enviarAvanceProyecto(data: NotificacionDatos): Promise<void> {
    logger.proceso("NotificacionesService.enviarAvanceProyecto", {
      email: data.clienteEmail,
      estado: data.estado,
    });
    const nombreEstado =
      {
        recibido: "Recibido",
        diseno: "Diseño",
        desarrollo: "Desarrollo",
        entregado: "Entregado",
      }[data.estado ?? ""] ?? data.estado;

    await this.email.send({
      to: data.clienteEmail,
      subject: `Tu proyecto avanzó a "${nombreEstado}" — MainPlataform`,
      html: `
        <h2>Hola, ${escapeHtml(data.clienteNombre)}</h2>
        <p>Tu proyecto <strong>${escapeHtml(data.proyectoNombre ?? "")}</strong>
           avanzó al estado: <strong>${nombreEstado}</strong>.</p>
        ${data.fechaEntrega ? `<p>Fecha estimada de entrega: ${formatearFecha(data.fechaEntrega)}</p>` : ""}
        <p>— Equipo MainPlataform</p>
      `,
    });
    logger.exito("NotificacionesService.enviarAvanceProyecto completado", {
      email: data.clienteEmail,
    });
  }

  /** Entrega: inicio del conteo de la garantía. */
  async enviarEntrega(
    data: NotificacionDatos & { fechaExpiracionGarantia: Date },
  ): Promise<void> {
    logger.proceso("NotificacionesService.enviarEntrega", {
      email: data.clienteEmail,
    });
    await this.email.send({
      to: data.clienteEmail,
      subject: "¡Tu proyecto fue entregado! — MainPlataform",
      html: `
        <h2>¡Tu proyecto fue entregado, ${escapeHtml(data.clienteNombre)}!</h2>
        <p><strong>${escapeHtml(data.proyectoNombre ?? "")}</strong> está listo.</p>
        <p>Tu <strong>garantía de soporte</strong> está activa hasta el
           <strong>${formatearFecha(data.fechaExpiracionGarantia)}</strong>.</p>
        <p>Si necesitas ajustes, escríbenos antes de que expire.</p>
        <p>— Equipo MainPlataform</p>
      `,
    });
    logger.exito("NotificacionesService.enviarEntrega completado", {
      email: data.clienteEmail,
    });
  }
}

export const notificacionesService = new NotificacionesService();
