import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { PagoModel } from "../src/models/pago.model";
import { BitacoraModel } from "../src/models/bitacora.model";

const app = createApp();

const paqueteSeed = {
  nombre: "Paquete Operativo",
  slug: "operativo",
  tipo: "operativo" as const,
  descripcion: "Mini dashboard con métricas",
  precio: 999,
  moneda: "USD",
  vistasIncluidas: 4,
  soporteMeses: 12,
  diasEntrega: 30,
};

async function crearAdmin(): Promise<string[]> {
  await UserModel.create({
    email: "admin@mainplataform.com",
    passwordHash: bcrypt.hashSync("Admin1234", 12),
    nombre: "Admin",
    rol: "admin",
  });
  const login = await request(app).post("/api/v1/auth/login").send({
    email: "admin@mainplataform.com",
    password: "Admin1234",
  });
  return login.headers["set-cookie"] as unknown as string[];
}

async function clienteConProyecto(): Promise<{
  cookies: string[];
  proyectoId: string;
}> {
  const paquete = await PaqueteModel.create(paqueteSeed);
  const cotizacion = await request(app).post("/api/v1/cotizaciones").send({
    tipoProducto: "paquete",
    paqueteId: String(paquete._id),
    nombre: "Ana",
    primerApellido: "Pérez",
    fechaNacimiento: "1995-04-12",
    aceptaCondiciones: true,
    aceptaDatos: true,
    email: "ana@correo.com",
    password: "Clave123",
  });
  const cookies = cotizacion.headers["set-cookie"] as unknown as string[];
  const usuario = await UserModel.findOne({
    email: "ana@correo.com",
  }).select("+emailVerificacionToken");
  await request(app)
    .post("/api/v1/auth/verificar-email")
    .send({ token: usuario!.emailVerificacionToken });
  return { cookies, proyectoId: cotizacion.body.entorno.id as string };
}

async function agregarEtapa(
  admin: string[],
  proyectoId: string,
  datos: { nombre: string; monto?: number; requierePago?: boolean },
): Promise<{ etapaId: string }> {
  const res = await request(app)
    .post(`/api/v1/proyectos/${proyectoId}/etapas`)
    .set("Cookie", admin)
    .send(datos);
  const etapas = res.body.etapas as Array<{ _id: string; nombre: string }>;
  const etapa = etapas.find((e) => e.nombre === datos.nombre);
  return { etapaId: String(etapa!._id) };
}

describe("Etapas del plan y bloqueo de entrega", () => {
  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      PaqueteModel.deleteMany({}),
      ProyectoModel.deleteMany({}),
      PagoModel.deleteMany({}),
      BitacoraModel.deleteMany({}),
    ]);
  });

  it("el admin agrega, edita, reordena y elimina etapas impagas", async () => {
    const admin = await crearAdmin();
    const { cookies, proyectoId } = await clienteConProyecto();

    await agregarEtapa(admin, proyectoId, {
      nombre: "Inicio de desarrollo",
      monto: 400,
    });
    const segunda = await agregarEtapa(admin, proyectoId, {
      nombre: "Despliegue",
      monto: 200,
    });

    const edicion = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/etapas/${segunda.etapaId}`)
      .set("Cookie", admin)
      .send({ descripcion: "Publicación y pruebas finales" });
    expect(edicion.status).toBe(200);
    const etapas = edicion.body.etapas as Array<{
      _id: string;
      descripcion: string;
    }>;
    const editada = etapas.find((e) => e._id === segunda.etapaId);
    expect(editada!.descripcion).toContain("Publicación");

    const reorden = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/etapas/orden`)
      .set("Cookie", admin)
      .send({
        orden: [etapas[0]._id, ...etapas.slice(1).reverse().map((e) => e._id)],
      });
    expect(reorden.status).toBe(200);

    const eliminada = await request(app)
      .delete(`/api/v1/proyectos/${proyectoId}/etapas/${segunda.etapaId}`)
      .set("Cookie", admin);
    expect(eliminada.status).toBe(200);
    expect((eliminada.body.etapas as unknown[]).length).toBe(2);

    const clienteIntenta = await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/etapas`)
      .set("Cookie", cookies)
      .send({ nombre: "Otra" });
    expect(clienteIntenta.status).toBe(403);
  });

  it("solicitar-pago usa el monto de la etapa y su confirmación la desbloquea", async () => {
    const admin = await crearAdmin();
    const { proyectoId } = await clienteConProyecto();
    const { etapaId } = await agregarEtapa(admin, proyectoId, {
      nombre: "Inicio de desarrollo",
      monto: 400,
    });

    const solicitud = await request(app)
      .post(
        `/api/v1/proyectos/${proyectoId}/etapas/${etapaId}/solicitar-pago`,
      )
      .set("Cookie", admin);
    expect(solicitud.status).toBe(201);
    expect(solicitud.body.pago.monto).toBe(400);
    const pagoId = solicitud.body.pago.id as string;

    const trasSolicitud = await ProyectoModel.findById(proyectoId);
    expect(trasSolicitud!.etapas[1].pagoEstado).toBe("solicitado");

    // Completar antes de pagar falla.
    const completarSinPago = await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/etapas/${etapaId}/estado`)
      .set("Cookie", admin)
      .send({ estado: "completada" });
    expect(completarSinPago.status).toBe(400);

    await request(app)
      .post(`/api/v1/pagos/${pagoId}/confirmar`)
      .set("Cookie", admin);

    const completar = await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/etapas/${etapaId}/estado`)
      .set("Cookie", admin)
      .send({ estado: "completada" });
    expect(completar.status).toBe(200);

    const proyecto = await request(app)
      .get(`/api/v1/proyectos/${proyectoId}`)
      .set("Cookie", admin);
    expect(proyecto.body.proyecto.etapasTotal).toBe(2);
    expect(proyecto.body.proyecto.etapasCompletadas).toBe(1);
    expect(proyecto.body.proyecto.montoPagado).toBe(400);
  });

  it("el desbloqueo manual sin pago queda en bitácora", async () => {
    const admin = await crearAdmin();
    const { proyectoId } = await clienteConProyecto();
    const { etapaId } = await agregarEtapa(admin, proyectoId, {
      nombre: "Inicio de desarrollo",
      monto: 400,
    });

    const desbloqueo = await request(app)
      .post(`/api/v1/proyectos/${proyectoId}/etapas/${etapaId}/estado`)
      .set("Cookie", admin)
      .send({ estado: "en_curso" });
    expect(desbloqueo.status).toBe(200);

    const proyecto = await ProyectoModel.findById(proyectoId);
    expect(proyecto!.etapas[1].estado).toBe("en_curso");
    expect(proyecto!.etapas[1].pagoEstado).toBe("pendiente");

    const bitacora = await BitacoraModel.find({ proyectoId });
    expect(
      bitacora.some((b) => b.mensaje.includes("desbloqueada manualmente")),
    ).toBe(true);
  });

  it("la entrega se bloquea con etapas sin pagar (y se fuerza con forzar)", async () => {
    const admin = await crearAdmin();
    const { proyectoId } = await clienteConProyecto();
    await agregarEtapa(admin, proyectoId, {
      nombre: "Inicio de desarrollo",
      monto: 400,
    });

    for (const estado of ["recibido", "diseno", "desarrollo"]) {
      const res = await request(app)
        .put(`/api/v1/proyectos/${proyectoId}/estado`)
        .set("Cookie", admin)
        .send({ estado });
      expect(res.status).toBe(200);
    }

    const bloqueada = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/estado`)
      .set("Cookie", admin)
      .send({ estado: "entregado" });
    expect(bloqueada.status).toBe(402);
    expect(bloqueada.body.error.code).toBe("PAYMENT_REQUIRED");

    const forzada = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/estado`)
      .set("Cookie", admin)
      .send({ estado: "entregado", forzar: true });
    expect(forzada.status).toBe(200);

    const bitacora = await BitacoraModel.find({ proyectoId });
    expect(
      bitacora.some((b) => b.mensaje.includes("Entrega forzada")),
    ).toBe(true);
  });

  it("la etapa de planeación no se elimina, no se cobra y va siempre primera", async () => {
    const admin = await crearAdmin();
    const { proyectoId } = await clienteConProyecto();
    const proyecto = await ProyectoModel.findById(proyectoId);
    const etapaId = String(
      (proyecto!.etapas[0] as unknown as { _id: unknown })._id,
    );

    const eliminada = await request(app)
      .delete(`/api/v1/proyectos/${proyectoId}/etapas/${etapaId}`)
      .set("Cookie", admin);
    expect(eliminada.status).toBe(409);

    const cobrada = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/etapas/${etapaId}`)
      .set("Cookie", admin)
      .send({ monto: 100 });
    expect(cobrada.status).toBe(409);

    const otra = await agregarEtapa(admin, proyectoId, {
      nombre: "Inicio de desarrollo",
      monto: 400,
    });
    const reorden = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/etapas/orden`)
      .set("Cookie", admin)
      .send({ orden: [otra.etapaId, etapaId] });
    expect(reorden.status).toBe(400);
  });

  it("pausa y reanuda un proyecto", async () => {
    const admin = await crearAdmin();
    const { proyectoId } = await clienteConProyecto();

    const pausa = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/estado`)
      .set("Cookie", admin)
      .send({ estado: "pausado" });
    expect(pausa.status).toBe(200);
    expect(pausa.body.proyecto.estado).toBe("pausado");

    const reanudar = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/estado`)
      .set("Cookie", admin)
      .send({ estado: "planeacion" });
    expect(reanudar.status).toBe(200);
    expect(reanudar.body.proyecto.estado).toBe("planeacion");

    const cancelar = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/estado`)
      .set("Cookie", admin)
      .send({ estado: "cancelado" });
    expect(cancelar.status).toBe(200);

    const desdeCancelado = await request(app)
      .put(`/api/v1/proyectos/${proyectoId}/estado`)
      .set("Cookie", admin)
      .send({ estado: "recibido" });
    expect(desdeCancelado.status).toBe(400);
  });
});
