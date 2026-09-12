import PDFDocument from "pdfkit";
import { InformeModel, pruebasIniciales } from "../models/informe.model";
import { ProyectoModel } from "../models/proyecto.model";
import { EspacioModel } from "../models/espacio.model";
import { BriefingModel } from "../models/briefing.model";
import { VistaDisenoModel } from "../models/vista-diseno.model";
import { SolicitudFuncionModel } from "../models/solicitud-funcion.model";
import { UserModel } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";

export type FamiliaInforme = "proyecto" | "espacio";
export type TipoPrueba = "rendimiento" | "seguridad" | "test";

interface PruebaJson {
  id: string;
  tipo: TipoPrueba;
  titulo: string;
  descripcion: string;
  calificacion: number | null;
  exitoso: boolean | null;
  createdAt: Date;
}

interface InformeResumenJson {
  entorno: {
    tipo: FamiliaInforme;
    id: string;
    nombre: string;
    estado: string;
    moneda: string;
    cliente: string;
  };
  vistas: number;
  funciones: number;
  costoTotal: number;
  montoPagado: number;
  impacto: { porcentaje: number | null; descripcion: string };
  rendimiento: { total: number; promedio: number | null };
  seguridad: { total: number; promedio: number | null };
  tests: { total: number; aprobados: number };
}

interface InformeDetalladoJson extends InformeResumenJson {
  pruebas: PruebaJson[];
}

interface EntornoInfo {
  id: string;
  nombre: string;
  estado: string;
  moneda: string;
  clienteId: string;
  costoTotal: number;
  montoPagado: number;
  etapas: Array<{ monto: number; requierePago: boolean; pagoEstado: string }>;
}

/**
 * Informe técnico del entorno: resumen para el cliente y detalle editable por
 * el admin, con descarga en PDF.
 */
export class InformeService {
  /** Resumen (cliente) o resumen + detalle (admin). Crea el informe si falta. */
  async obtener(
    familia: FamiliaInforme,
    id: string,
    rol: "admin" | "cliente",
    userId: string,
  ): Promise<InformeResumenJson | InformeDetalladoJson> {
    logger.proceso("InformeService.obtener", { familia, id });
    const entorno = await this.cargarEntorno(familia, id);
    if (rol === "cliente" && entorno.clienteId !== userId) {
      throw ApiError.forbidden("No tienes acceso a este informe");
    }

    const informe = await this.getOrCreate(familia, id);
    const pruebas = (informe.pruebas ?? []) as unknown as Array<{
      _id: unknown;
      tipo: TipoPrueba;
      titulo: string;
      descripcion: string;
      calificacion: number | null;
      exitoso: boolean | null;
      createdAt: Date;
    }>;

    const resumen = await this.construirResumen(familia, id, entorno, pruebas);
    logger.exito("InformeService.obtener completado", { familia, id });

    if (rol !== "admin") return resumen;
    return { ...resumen, pruebas: pruebas.map(toPruebaJson) };
  }

  /** Admin: agrega una prueba o test al informe. */
  async agregarPrueba(
    familia: FamiliaInforme,
    id: string,
    datos: {
      tipo: TipoPrueba;
      titulo: string;
      descripcion?: string;
      calificacion?: number | null;
      exitoso?: boolean | null;
    },
    adminId: string,
  ): Promise<PruebaJson[]> {
    logger.proceso("InformeService.agregarPrueba", { familia, id });
    await this.cargarEntorno(familia, id);
    const informe = await this.getOrCreate(familia, id);

    informe.pruebas.push({
      tipo: datos.tipo,
      titulo: datos.titulo,
      descripcion: datos.descripcion ?? "",
      calificacion: datos.tipo === "test" ? null : (datos.calificacion ?? null),
      exitoso: datos.tipo === "test" ? (datos.exitoso ?? false) : null,
      creadaPor: adminId as never,
      createdAt: new Date(),
    } as never);
    informe.markModified("pruebas");
    await informe.save();

    logger.exito("InformeService.agregarPrueba completado", { familia, id });
    return this.pruebasJson(informe);
  }

  /** Admin: edita una prueba o test. */
  async actualizarPrueba(
    familia: FamiliaInforme,
    id: string,
    pruebaId: string,
    datos: {
      titulo?: string;
      descripcion?: string;
      calificacion?: number | null;
      exitoso?: boolean | null;
    },
  ): Promise<PruebaJson[]> {
    logger.proceso("InformeService.actualizarPrueba", { familia, id });
    await this.cargarEntorno(familia, id);
    const informe = await this.getOrCreate(familia, id);
    const pruebas = informe.pruebas as unknown as Array<{
      _id: unknown;
      tipo: TipoPrueba;
      titulo: string;
      descripcion: string;
      calificacion: number | null;
      exitoso: boolean | null;
    }>;
    const prueba = pruebas.find((p) => String(p._id) === pruebaId);
    if (!prueba) throw ApiError.notFound("Prueba no encontrada");

    if (typeof datos.titulo === "string") prueba.titulo = datos.titulo;
    if (typeof datos.descripcion === "string") {
      prueba.descripcion = datos.descripcion;
    }
    if (prueba.tipo === "test") {
      if (typeof datos.exitoso === "boolean") prueba.exitoso = datos.exitoso;
    } else if (
      datos.calificacion === null ||
      typeof datos.calificacion === "number"
    ) {
      prueba.calificacion = datos.calificacion;
    }
    informe.markModified("pruebas");
    await informe.save();

    logger.exito("InformeService.actualizarPrueba completado", { pruebaId });
    return this.pruebasJson(informe);
  }

  /** Admin: elimina una prueba o test. */
  async eliminarPrueba(
    familia: FamiliaInforme,
    id: string,
    pruebaId: string,
  ): Promise<PruebaJson[]> {
    logger.proceso("InformeService.eliminarPrueba", { familia, id });
    await this.cargarEntorno(familia, id);
    const informe = await this.getOrCreate(familia, id);
    const pruebas = informe.pruebas as unknown as Array<{ _id: unknown }>;
    const indice = pruebas.findIndex((p) => String(p._id) === pruebaId);
    if (indice < 0) throw ApiError.notFound("Prueba no encontrada");
    pruebas.splice(indice, 1);
    informe.markModified("pruebas");
    await informe.save();
    logger.exito("InformeService.eliminarPrueba completado", { pruebaId });
    return this.pruebasJson(informe);
  }

  /** Admin: guarda el impacto calculado (porcentaje + nota). */
  async actualizarImpacto(
    familia: FamiliaInforme,
    id: string,
    datos: { porcentaje: number | null; descripcion?: string },
  ): Promise<{ porcentaje: number | null; descripcion: string }> {
    logger.proceso("InformeService.actualizarImpacto", { familia, id });
    await this.cargarEntorno(familia, id);
    const informe = await this.getOrCreate(familia, id);
    const impacto = {
      porcentaje: datos.porcentaje,
      descripcion: datos.descripcion ?? "",
    };
    informe.set("impacto", impacto);
    await informe.save();
    logger.exito("InformeService.actualizarImpacto completado", {
      familia,
      id,
    });
    return impacto;
  }

  /** PDF con todo el detalle para el cliente (o el admin). */
  async generarPdf(
    familia: FamiliaInforme,
    id: string,
    rol: "admin" | "cliente",
    userId: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    logger.proceso("InformeService.generarPdf", { familia, id });
    const detallado = (await this.obtener(
      familia,
      id,
      rol,
      userId,
    )) as InformeDetalladoJson;
    // El cliente recibe el detalle completo en el PDF.
    const pruebas =
      detallado.pruebas ??
      (await this.getOrCreate(familia, id).then((i) => this.pruebasJson(i)));

    const buffer = await this.construirPdf({ ...detallado, pruebas });
    const nombreArchivo = `informe-${detallado.entorno.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}.pdf`;

    logger.exito("InformeService.generarPdf completado", { familia, id });
    return { buffer, nombreArchivo };
  }

  private pruebasJson(informe: { pruebas?: unknown }): PruebaJson[] {
    return (
      (informe.pruebas ?? []) as unknown as Array<Record<string, unknown>>
    ).map(toPruebaJson);
  }

  /** Crea el informe con las pruebas base la primera vez (idempotente). */
  private async getOrCreate(familia: FamiliaInforme, id: string) {
    const filtro =
      familia === "proyecto" ? { proyectoId: id } : { espacioId: id };
    const existente = await InformeModel.findOne(filtro);
    if (existente) return existente;
    return InformeModel.findOneAndUpdate(
      filtro,
      {
        $setOnInsert: {
          ...filtro,
          impacto: { porcentaje: null, descripcion: "" },
          pruebas: pruebasIniciales(),
        },
      },
      { upsert: true, new: true },
    );
  }

  private async cargarEntorno(
    familia: FamiliaInforme,
    id: string,
  ): Promise<EntornoInfo> {
    if (familia === "proyecto") {
      const proyecto = await ProyectoModel.findById(id).lean();
      if (!proyecto) throw ApiError.notFound("Proyecto no encontrado");
      const etapas = (proyecto.etapas ??
        []) as unknown as EntornoInfo["etapas"];
      return {
        id,
        nombre: proyecto.paquete?.nombre ?? "Proyecto",
        estado: proyecto.estado,
        moneda: proyecto.moneda ?? "USD",
        clienteId: String(proyecto.clienteId),
        ...sumarEtapas(etapas),
        etapas,
      };
    }
    const espacio = await EspacioModel.findById(id).lean();
    if (!espacio) throw ApiError.notFound("Espacio no encontrado");
    const etapas = (espacio.etapas ?? []) as unknown as EntornoInfo["etapas"];
    return {
      id,
      nombre: espacio.productoSlug || "Entorno",
      estado: espacio.estado,
      moneda: espacio.moneda ?? "USD",
      clienteId: String(espacio.clienteId),
      ...sumarEtapas(etapas),
      etapas,
    };
  }

  private async construirResumen(
    familia: FamiliaInforme,
    id: string,
    entorno: EntornoInfo,
    pruebas: Array<{ tipo: TipoPrueba; calificacion: number | null }>,
  ): Promise<InformeResumenJson> {
    const filtro =
      familia === "proyecto" ? { proyectoId: id } : { espacioId: id };
    const [vistas, funciones, usuario] = await Promise.all([
      familia === "proyecto"
        ? BriefingModel.findOne({ proyectoId: id })
            .lean()
            .then((b) => (b?.contenido?.vistas ?? []).length)
        : VistaDisenoModel.countDocuments({ espacioId: id }),
      SolicitudFuncionModel.countDocuments(filtro),
      UserModel.findById(entorno.clienteId).select("nombre email").lean(),
    ]);

    const informe = await this.getOrCreate(familia, id);
    const rendimiento = pruebas.filter((p) => p.tipo === "rendimiento");
    const seguridad = pruebas.filter((p) => p.tipo === "seguridad");
    const tests = pruebas.filter((p) => p.tipo === "test");

    return {
      entorno: {
        tipo: familia,
        id,
        nombre: entorno.nombre,
        estado: entorno.estado,
        moneda: entorno.moneda,
        cliente: usuario?.nombre ?? "",
      },
      vistas,
      funciones,
      costoTotal: entorno.costoTotal,
      montoPagado: entorno.montoPagado,
      impacto: {
        porcentaje: informe.impacto?.porcentaje ?? null,
        descripcion: informe.impacto?.descripcion ?? "",
      },
      rendimiento: {
        total: rendimiento.length,
        promedio: promedio(rendimiento.map((p) => p.calificacion)),
      },
      seguridad: {
        total: seguridad.length,
        promedio: promedio(seguridad.map((p) => p.calificacion)),
      },
      tests: {
        total: tests.length,
        aprobados: (
          tests as unknown as Array<{ exitoso: boolean | null }>
        ).filter((t) => t.exitoso === true).length,
      },
    };
  }

  private construirPdf(datos: InformeDetalladoJson): Promise<Buffer> {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const partes: Buffer[] = [];
    doc.on("data", (parte: Buffer) => partes.push(parte));
    const listo = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(partes)));
    });

    const acento = "#b45309";
    doc
      .fillColor("#0f1b2d")
      .fontSize(22)
      .text("DaJu Plataform", { continued: false });
    doc.fillColor(acento).fontSize(14).text("Informe técnico del proyecto");
    doc.moveDown(0.5);
    doc
      .fillColor("#334155")
      .fontSize(10)
      .text(`Cliente: ${datos.entorno.cliente}`);
    doc.text(`Entorno: ${datos.entorno.nombre}`);
    doc.text(`Estado: ${datos.entorno.estado}`);
    doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`);
    doc.moveDown(1);

    doc.fillColor("#0f1b2d").fontSize(14).text("Resumen");
    doc.fillColor("#334155").fontSize(11).text(`Vistas: ${datos.vistas}`);
    doc.text(`Funciones: ${datos.funciones}`);
    doc.text(
      `Costo total: $${datos.costoTotal.toLocaleString("es-CO")} ${datos.entorno.moneda}`,
    );
    doc.text(
      `Pagado: $${datos.montoPagado.toLocaleString("es-CO")} ${datos.entorno.moneda}`,
    );
    doc.text(
      `Impacto calculado: ${
        datos.impacto.porcentaje != null
          ? `${datos.impacto.porcentaje}%`
          : "pendiente"
      }${datos.impacto.descripcion ? ` — ${datos.impacto.descripcion}` : ""}`,
    );
    doc.text(
      `Tests: ${datos.tests.aprobados} aprobados de ${datos.tests.total}`,
    );
    doc.moveDown(1);

    this.seccionPdf(
      doc,
      "Pruebas de rendimiento",
      datos.pruebas.filter((p) => p.tipo === "rendimiento"),
    );
    this.seccionPdf(
      doc,
      "Pruebas de seguridad",
      datos.pruebas.filter((p) => p.tipo === "seguridad"),
    );

    doc.moveDown(0.5);
    doc.fillColor("#0f1b2d").fontSize(14).text("Tests ejecutados");
    const tests = datos.pruebas.filter((p) => p.tipo === "test");
    if (tests.length === 0) {
      doc.fillColor("#64748b").fontSize(10).text("Sin tests registrados.");
    }
    for (const t of tests) {
      doc
        .fillColor("#0f1b2d")
        .fontSize(11)
        .text(`${t.exitoso ? "[APROBADO]" : "[FALLIDO]"} ${t.titulo}`);
      if (t.descripcion) {
        doc.fillColor("#475569").fontSize(10).text(t.descripcion);
      }
      doc.moveDown(0.3);
    }

    doc.moveDown(1.5);
    doc
      .fillColor("#94a3b8")
      .fontSize(9)
      .text("Documento generado por DaJu Plataform.", { align: "center" });

    doc.end();
    return listo;
  }

  private seccionPdf(
    doc: PDFKit.PDFDocument,
    titulo: string,
    pruebas: PruebaJson[],
  ): void {
    doc.moveDown(0.5);
    doc.fillColor("#0f1b2d").fontSize(14).text(titulo);
    if (pruebas.length === 0) {
      doc.fillColor("#64748b").fontSize(10).text("Sin pruebas registradas.");
      return;
    }
    for (const p of pruebas) {
      doc.fillColor("#0f1b2d").fontSize(11).text(p.titulo);
      if (p.descripcion) {
        doc.fillColor("#475569").fontSize(10).text(p.descripcion);
      }
      doc
        .fillColor("#0f1b2d")
        .fontSize(11)
        .text(
          `Calificación: ${
            p.calificacion != null ? `${p.calificacion}/100` : "pendiente"
          }`,
        );
      doc.moveDown(0.3);
    }
  }
}

function toPruebaJson(p: Record<string, unknown>): PruebaJson {
  return {
    id: String(p._id),
    tipo: p.tipo as TipoPrueba,
    titulo: String(p.titulo),
    descripcion: String(p.descripcion ?? ""),
    calificacion: (p.calificacion as number | null) ?? null,
    exitoso: (p.exitoso as boolean | null) ?? null,
    createdAt: p.createdAt as Date,
  };
}

function sumarEtapas(
  etapas: Array<{ monto: number; requierePago: boolean; pagoEstado: string }>,
): { costoTotal: number; montoPagado: number } {
  return {
    costoTotal: etapas
      .filter((e) => e.requierePago)
      .reduce((suma, e) => suma + (e.monto ?? 0), 0),
    montoPagado: etapas
      .filter((e) => e.pagoEstado === "pagado")
      .reduce((suma, e) => suma + (e.monto ?? 0), 0),
  };
}

function promedio(valores: Array<number | null>): number | null {
  const validos = valores.filter((v): v is number => typeof v === "number");
  if (validos.length === 0) return null;
  return Math.round(validos.reduce((a, b) => a + b, 0) / validos.length);
}

export const informeService = new InformeService();
