import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { PaqueteModel } from "../src/models/paquete.model";
import { PlantillaModel } from "../src/models/plantilla.model";
import { ProyectoModel } from "../src/models/proyecto.model";
import { EspacioModel } from "../src/models/espacio.model";
import { FuncionalidadExtraModel } from "../src/models/funcionalidad-extra.model";

const app = createApp();

const paqueteSeed = {
  nombre: "Paquete Validor",
  slug: "validor",
  tipo: "validor" as const,
  descripcion: "Landing de una vista",
  precio: 199,
  moneda: "USD",
  vistasIncluidas: 1,
  soporteMeses: 2,
  diasEntrega: 15,
};

async function verificar(): Promise<void> {
  const usuario = await UserModel.findOne({
    email: "ana@correo.com",
  }).select("+emailVerificacionToken");
  await request(app)
    .post("/api/v1/auth/verificar-email")
    .send({ token: usuario!.emailVerificacionToken });
}

async function cotizarProyecto(): Promise<{
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
  await verificar();
  return { cookies, proyectoId: cotizacion.body.entorno.id as string };
}

async function cotizarEspacio(): Promise<{
  cookies: string[];
  espacioId: string;
}> {
  const plantilla = await PlantillaModel.create({
    nombre: "Plantilla Reservas",
    slug: "reservas",
    plataforma: "Reservas",
    descripcion: "Sistema de reservas",
    precio: 299,
    moneda: "USD",
    vistasIncluidas: 5,
    soporteMeses: 3,
    diasEntrega: 20,
    features: [],
  });
  const cotizacion = await request(app).post("/api/v1/cotizaciones").send({
    tipoProducto: "plantilla",
    productoId: String(plantilla._id),
    nombre: "Ana",
    primerApellido: "Pérez",
    fechaNacimiento: "1995-04-12",
    aceptaCondiciones: true,
    aceptaDatos: true,
    email: "ana@correo.com",
    password: "Clave123",
  });
  const cookies = cotizacion.headers["set-cookie"] as unknown as string[];
  await verificar();
  return { cookies, espacioId: cotizacion.body.entorno.id as string };
}

describe("Catálogo de funciones dentro del proyecto", () => {
  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      PaqueteModel.deleteMany({}),
      PlantillaModel.deleteMany({}),
      ProyectoModel.deleteMany({}),
      EspacioModel.deleteMany({}),
      FuncionalidadExtraModel.deleteMany({}),
    ]);
  });

  it("el catálogo público lista las funciones activas con precio", async () => {
    await FuncionalidadExtraModel.create([
      {
        nombre: "Blog integrado",
        clave: "blog-integrado",
        descripcion: "Noticias y artículos",
        categoria: "pagina",
        complejidad: "media",
        precio: 40,
        activo: true,
      },
      {
        nombre: "Función vieja",
        clave: "funcion-vieja",
        descripcion: "Inactiva",
        categoria: "datos",
        complejidad: "facil",
        precio: 20,
        activo: false,
      },
    ]);

    const res = await request(app).get("/api/v1/funcionalidades");
    expect(res.status).toBe(200);
    expect(res.body.funcionalidades).toHaveLength(1);
    expect(res.body.funcionalidades[0]).toMatchObject({
      nombre: "Blog integrado",
      precio: 40,
    });
  });

  it("en paquetes, pedir una función del catálogo agrega la vista con su precio sugerido", async () => {
    const { cookies, proyectoId } = await cotizarProyecto();

    const res = await request(app)
      .post(`/api/v1/briefing/${proyectoId}/vistas`)
      .set("Cookie", cookies)
      .send({ nombre: "Blog integrado", costoSugerido: 40 });
    expect(res.status).toBe(201);

    const solicitudes = await request(app)
      .get(`/api/v1/proyectos/${proyectoId}/solicitudes`)
      .set("Cookie", cookies);
    expect(solicitudes.status).toBe(200);
    expect(solicitudes.body.solicitudes).toHaveLength(1);
    expect(solicitudes.body.solicitudes[0]).toMatchObject({
      titulo: "Blog integrado",
      costoSugerido: 40,
      origen: "catalogo",
      estado: "abierta",
    });
  });

  it("en plantillas, la función del catálogo abre la solicitud con precio sugerido", async () => {
    const { cookies, espacioId } = await cotizarEspacio();

    const res = await request(app)
      .post(`/api/v1/espacios/${espacioId}/solicitudes`)
      .set("Cookie", cookies)
      .send({
        titulo: "Blog integrado",
        descripcion: "Noticias y artículos del negocio",
        costoSugerido: 40,
        origen: "catalogo",
        catalogoClave: "abc123",
      });
    expect(res.status).toBe(201);
    expect(res.body.solicitud).toMatchObject({
      titulo: "Blog integrado",
      costoSugerido: 40,
      origen: "catalogo",
      catalogoClave: "abc123",
    });
  });

  it("la vista sugerida también abre su negociación en plantillas", async () => {
    const { cookies, espacioId } = await cotizarEspacio();

    const res = await request(app)
      .post(`/api/v1/espacios/${espacioId}/vistas`)
      .set("Cookie", cookies)
      .send({ nombre: "Inicio" });
    expect(res.status).toBe(201);

    const solicitudes = await request(app)
      .get(`/api/v1/espacios/${espacioId}/solicitudes`)
      .set("Cookie", cookies);
    expect(
      solicitudes.body.solicitudes.some(
        (s: { titulo: string }) => s.titulo === "Inicio",
      ),
    ).toBe(true);
  });
});
