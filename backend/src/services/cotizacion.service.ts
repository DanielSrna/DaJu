import { ProyectoModel } from "../models/proyecto.model";
import { EspacioModel } from "../models/espacio.model";
import { UserModel } from "../models/user.model";
import { etapaPlaneacion } from "../models/etapa.schema";
import { productoService, TipoProducto, ItemCompra } from "./producto.service";
import { cuentaService } from "./cuenta.service";
import { authService, PublicUser } from "./auth.service";
import { ApiError } from "../utils/ApiError";
import { esMayorDeEdad } from "../utils/fechas";
import { VERSION_CONDICIONES, VERSION_DATOS } from "../utils/legal";
import { logger } from "../config/logger";

interface CotizacionJson {
  entorno: {
    tipo: "proyecto" | "espacio";
    id: string;
    tipoProducto: TipoProducto;
    productoSlug: string;
    productoNombre: string;
    estado: string;
  };
  usuario: PublicUser;
  nuevo: boolean;
}

interface EntornoDoc {
  _id: unknown;
  estado: string;
}

interface DatosProducto {
  tipoProducto?: TipoProducto;
  paqueteId?: string;
  productoId?: string;
}

/**
 * Cotización: registra al cliente con el producto que le interesa y abre su
 * entorno en "planeacion" (fase de planeación y diseño, gratis). No cobra:
 * el pago se solicita después desde el panel admin.
 */
export class CotizacionService {
  async crear(
    data: {
      email: string;
      nombre?: string;
      segundoNombre?: string;
      primerApellido?: string;
      segundoApellido?: string;
      fechaNacimiento?: string;
      aceptaCondiciones?: boolean;
      aceptaDatos?: boolean;
      password?: string;
    } & DatosProducto,
  ): Promise<CotizacionJson> {
    logger.proceso("CotizacionService.crear", {
      tipoProducto: data.tipoProducto ?? "paquete",
      productoId: data.productoId ?? data.paqueteId,
    });

    const { tipo, item } = await this.resolverProducto(data);
    const email = data.email.trim().toLowerCase();

    // Registro nuevo: se exige identidad completa, mayoría de edad y contratos.
    const cuentaExistente = await UserModel.exists({ email });
    if (!cuentaExistente) {
      if (!data.nombre || !data.primerApellido) {
        throw ApiError.validation("Nombre y primer apellido son obligatorios");
      }
      const fechaNacimiento = data.fechaNacimiento
        ? new Date(data.fechaNacimiento)
        : null;
      if (!fechaNacimiento || Number.isNaN(fechaNacimiento.getTime())) {
        throw ApiError.validation("La fecha de nacimiento es obligatoria");
      }
      if (!esMayorDeEdad(fechaNacimiento)) {
        throw ApiError.validation(
          "Debes ser mayor de edad para registrarte en la plataforma",
        );
      }
      if (!data.aceptaCondiciones || !data.aceptaDatos) {
        throw ApiError.validation(
          "Debes aceptar el contrato de condiciones y el de manejo de datos para registrarte",
        );
      }
    }

    const datosCuenta: {
      email: string;
      nombre?: string;
      segundoNombre?: string;
      primerApellido?: string;
      segundoApellido?: string;
      fechaNacimiento?: Date;
      aceptaCondiciones?: { version: string; fecha: Date };
      aceptaDatos?: { version: string; fecha: Date };
      password?: string;
    } = { email };
    if (data.nombre !== undefined) datosCuenta.nombre = data.nombre;
    if (data.segundoNombre !== undefined)
      datosCuenta.segundoNombre = data.segundoNombre;
    if (data.primerApellido !== undefined)
      datosCuenta.primerApellido = data.primerApellido;
    if (data.segundoApellido !== undefined)
      datosCuenta.segundoApellido = data.segundoApellido;
    if (data.fechaNacimiento)
      datosCuenta.fechaNacimiento = new Date(data.fechaNacimiento);
    if (!cuentaExistente && data.aceptaCondiciones) {
      datosCuenta.aceptaCondiciones = {
        version: VERSION_CONDICIONES,
        fecha: new Date(),
      };
    }
    if (!cuentaExistente && data.aceptaDatos) {
      datosCuenta.aceptaDatos = { version: VERSION_DATOS, fecha: new Date() };
    }
    if (data.password !== undefined) datosCuenta.password = data.password;
    const { id: clienteId, nuevo } =
      await cuentaService.resolverOCrearCliente(datosCuenta);

    const { doc, usuario } = await this.abrirEntorno(tipo, item, clienteId);
    return this.toJson(doc, item, usuario, nuevo);
  }

  /**
   * Cliente ya autenticado (y verificado): adquiere otro producto sin volver
   * a registrarse ni repetir los contratos.
   */
  async crearParaCliente(
    clienteId: string,
    data: DatosProducto,
  ): Promise<CotizacionJson> {
    logger.proceso("CotizacionService.crearParaCliente", { clienteId });
    const usuarioDoc = await UserModel.findById(clienteId).lean();
    if (!usuarioDoc) throw ApiError.unauthorized("Cuenta no disponible");
    if (usuarioDoc.rol !== "cliente") {
      throw ApiError.validation(
        "Las cuentas de administrador no pueden comprar",
      );
    }

    const { tipo, item } = await this.resolverProducto(data);
    const { doc, usuario } = await this.abrirEntorno(tipo, item, clienteId);
    return this.toJson(doc, item, usuario, false);
  }

  private async resolverProducto(data: DatosProducto): Promise<{
    tipo: TipoProducto;
    item: ItemCompra;
  }> {
    const tipo = (data.tipoProducto ?? "paquete") as TipoProducto;
    if (tipo === "funcionalidad") {
      throw ApiError.validation("Tipo de producto inválido");
    }
    const item = await productoService.resolverItem(tipo, data);
    if (!item) {
      logger.fracaso("CotizacionService: ítem no disponible", {
        tipo,
        productoId: data.productoId ?? data.paqueteId,
      });
      throw ApiError.notFound("Producto no disponible");
    }
    return { tipo, item };
  }

  /** Reutiliza el entorno vigente del mismo producto o crea uno nuevo. */
  private async abrirEntorno(
    tipo: TipoProducto,
    item: ItemCompra,
    clienteId: string,
  ): Promise<{ doc: EntornoDoc; usuario: PublicUser }> {
    const existente =
      tipo === "paquete"
        ? await ProyectoModel.findOne({
            clienteId,
            "paquete.slug": item.slug,
            estado: { $nin: ["cancelado"] },
          })
        : await EspacioModel.findOne({
            clienteId,
            productoId: item.id,
            estado: { $nin: ["cancelado"] },
          });

    if (existente) {
      const usuario = await authService.getMe(clienteId);
      logger.exito("CotizacionService: entorno existente reutilizado", {
        clienteId,
        entornoId: String(existente._id),
      });
      return { doc: existente, usuario };
    }

    const doc =
      tipo === "paquete"
        ? await ProyectoModel.create({
            clienteId,
            paquete: {
              slug: item.slug,
              nombre: item.nombre,
              tipo: item.paquete?.tipo ?? "validor",
              vistasIncluidas: item.paquete?.vistasIncluidas ?? 1,
              soporteMeses: item.paquete?.soporteMeses ?? 2,
              diasEntrega: item.paquete?.diasEntrega ?? 15,
            },
            estado: "planeacion",
            fechaCompra: null,
            fechaEntrega: null,
            precioBase: item.precio,
            moneda: item.moneda,
            etapas: [etapaPlaneacion()],
          })
        : await EspacioModel.create({
            clienteId,
            tipoProducto: tipo,
            productoId: item.id,
            productoSlug: item.slug,
            estado: "planeacion",
            precioBase: item.precio,
            moneda: item.moneda,
            sesiones: { total: 0, usadas: 0 },
            etapas: [etapaPlaneacion()],
          });

    try {
      const usuario = await UserModel.findById(clienteId).lean();
      const { notificacionService } = await import("./notificacion.service");
      await notificacionService.crearAdmins({
        tipo: "plataforma",
        titulo: "Nuevo pedido en planeación",
        cuerpo: `${item.nombre} — ${usuario?.email ?? ""}`,
        contexto: "compra",
        contextoId: doc._id,
        creadaPor: clienteId,
      });
    } catch (error) {
      logger.fracaso("CotizacionService: notificación falló", {
        error: (error as Error).message,
      });
    }

    const usuario = await authService.getMe(clienteId);
    logger.exito("CotizacionService: entorno creado", {
      clienteId,
      entornoId: String(doc._id),
      tipoProducto: tipo,
      estado: doc.estado,
    });
    return { doc, usuario };
  }

  private toJson(
    doc: EntornoDoc,
    item: {
      nombre: string;
      slug: string;
      tipo: TipoProducto;
    },
    usuario: PublicUser,
    nuevo: boolean,
  ): CotizacionJson {
    return {
      entorno: {
        tipo: item.tipo === "paquete" ? "proyecto" : "espacio",
        id: String(doc._id),
        tipoProducto: item.tipo,
        productoSlug: item.slug,
        productoNombre: item.nombre,
        estado: doc.estado,
      },
      usuario,
      nuevo,
    };
  }
}

export const cotizacionService = new CotizacionService();
