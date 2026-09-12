import { PaqueteModel } from "../models/paquete.model";
import { PlantillaModel } from "../models/plantilla.model";
import { ServicioModel } from "../models/servicio.model";

export type TipoProducto =
  "paquete" | "plantilla" | "servicio" | "funcionalidad";

export interface ItemCompra {
  tipo: TipoProducto;
  nombre: string;
  slug: string;
  precio: number;
  moneda: string;
  id: string;
  /** Snapshot del paquete para crear el proyecto (solo tipo paquete). */
  paquete?: {
    tipo: "validor" | "corporativo" | "operativo";
    vistasIncluidas: number;
    soporteMeses: number;
    diasEntrega: number;
  };
}

/**
 * Resuelve el ítem del catálogo según su tipo (siempre activo).
 * Compartido por la cotización (registro) y el checkout legado.
 */
export class ProductoService {
  async resolverItem(
    tipo: TipoProducto,
    data: { paqueteId?: string; productoId?: string },
  ): Promise<ItemCompra | null> {
    const id =
      tipo === "paquete"
        ? (data.paqueteId ?? data.productoId)
        : data.productoId;
    if (!id) return null;

    if (tipo === "paquete") {
      const doc = await PaqueteModel.findById(id).lean();
      if (!doc || !doc.activo) return null;
      return {
        tipo,
        nombre: doc.nombre,
        slug: doc.slug,
        precio: doc.precio,
        moneda: doc.moneda ?? "USD",
        id,
        paquete: {
          tipo: doc.tipo,
          vistasIncluidas: doc.vistasIncluidas,
          soporteMeses: doc.soporteMeses,
          diasEntrega: doc.diasEntrega,
        },
      };
    }
    if (tipo === "plantilla") {
      const doc = await PlantillaModel.findById(id).lean();
      if (!doc || !doc.activo) return null;
      return {
        tipo,
        nombre: doc.nombre,
        slug: doc.slug,
        precio: doc.precio,
        moneda: doc.moneda ?? "USD",
        id,
      };
    }
    const doc = await ServicioModel.findById(id).lean();
    if (!doc || !doc.activo) return null;
    return {
      tipo,
      nombre: doc.nombre,
      slug: doc.slug,
      precio: doc.precio,
      moneda: doc.moneda ?? "USD",
      id,
    };
  }
}

export const productoService = new ProductoService();
