import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { CmsConfigModel } from "../src/models/cms-config.model";

async function loginAdmin(app: ReturnType<typeof createApp>) {
  const admin = await UserModel.create({
    email: "admin@mainplataform.com",
    passwordHash: bcrypt.hashSync("Admin123", 12),
    nombre: "Admin",
    rol: "admin" as const,
  });
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: admin.email, password: "Admin123" });
  return res.headers["set-cookie"] as unknown as string[];
}

import bcrypt from "bcryptjs";

describe("CMS editor (borrador y publicar)", () => {
  const app = createApp();
  let adminCookies: string[];

  beforeEach(async () => {
    await CmsConfigModel.deleteMany({});
    await UserModel.deleteMany({});
    adminCookies = await loginAdmin(app);
  });

  it("GET /cms público devuelve los campos del editor con default seguro", async () => {
    const res = await request(app).get("/api/v1/cms");

    expect(res.status).toBe(200);
    expect(res.body.textos).toEqual({});
    expect(res.body.descuento).toEqual({
      activo: false,
      porcentaje: 20,
      mensaje: "",
      hasta: null,
    });
    expect(res.body.diasExtra).toBe(0);
  });

  it("PATCH /cms/editor sin sesión admin → 401", async () => {
    const res = await request(app)
      .patch("/api/v1/cms/editor")
      .send({ diasExtra: 5 });

    expect(res.status).toBe(401);
  });

  it("el borrador se guarda SIN afectar la vista pública", async () => {
    const datos = {
      colores: { primario: "#7f1d1d", acento: "#fbbf24" },
      marquesina: { texto: "🎄 Navidad 40% off", activo: true },
      textos: { "productos.titulo": "Paquetes navideños" },
      descuento: { activo: true, porcentaje: 40, mensaje: "Descuento 40%" },
      diasExtra: 5,
    };

    const patch = await request(app)
      .patch("/api/v1/cms/editor")
      .set("Cookie", adminCookies)
      .send(datos);
    expect(patch.status).toBe(200);

    // La vitrina pública sigue sin los cambios
    const publico = await request(app).get("/api/v1/cms");
    expect(publico.body.colores.primario).not.toBe("#7f1d1d");
    expect(publico.body.descuento.activo).toBe(false);
    expect(publico.body.diasExtra).toBe(0);

    // El editor (solo admin) sí los ve
    const editor = await request(app)
      .get("/api/v1/cms/editor")
      .set("Cookie", adminCookies);
    expect(editor.status).toBe(200);
    expect(editor.body.editor.textos["productos.titulo"]).toBe(
      "Paquetes navideños",
    );
    expect(editor.body.editor.descuento.porcentaje).toBe(40);
  });

  it("POST /cms/publicar aplica el borrador a la vista pública y limpia pendientes", async () => {
    await request(app)
      .patch("/api/v1/cms/editor")
      .set("Cookie", adminCookies)
      .send({
        descuento: { activo: true, porcentaje: 70, mensaje: "Súper descuento" },
        diasExtra: 12,
      });

    const publicar = await request(app)
      .post("/api/v1/cms/publicar")
      .set("Cookie", adminCookies);
    expect(publicar.status).toBe(200);

    const publico = await request(app).get("/api/v1/cms");
    expect(publico.body.descuento).toEqual({
      activo: true,
      porcentaje: 70,
      mensaje: "Súper descuento",
      hasta: null,
    });
    expect(publico.body.diasExtra).toBe(12);

    // Sin pendientes tras publicar
    const editor = await request(app)
      .get("/api/v1/cms/editor")
      .set("Cookie", adminCookies);
    expect(editor.body.editor).toEqual({});
  });

  it("valida colores, porcentaje permitido y días extra no negativos", async () => {
    // Color inválido
    const maloColor = await request(app)
      .patch("/api/v1/cms/editor")
      .set("Cookie", adminCookies)
      .send({ colores: { primario: "malo" } });
    expect(maloColor.status).toBe(400);

    // Porcentaje fuera de la lista permitida (20/40/70)
    const maloPct = await request(app)
      .patch("/api/v1/cms/editor")
      .set("Cookie", adminCookies)
      .send({ descuento: { activo: true, porcentaje: 35 } });
    expect(maloPct.status).toBe(400);

    // Días extra negativos
    const maloDias = await request(app)
      .patch("/api/v1/cms/editor")
      .set("Cookie", adminCookies)
      .send({ diasExtra: -1 });
    expect(maloDias.status).toBe(400);
  });
});
