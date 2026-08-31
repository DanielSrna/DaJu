import request from "supertest";
import { createApp } from "../src/app";
import { UserModel } from "../src/models/user.model";
import { COOKIE_NAMES } from "../src/utils/jwt";

describe("Auth API", () => {
  const app = createApp();
  const baseUser = { email: "cliente@correo.com", password: "Clave123", nombre: "Juan Pérez" };

  afterEach(async () => {
    await UserModel.deleteMany({});
  });

  describe("POST /api/v1/auth/register", () => {
    it("registra un cliente y emite cookies de sesión", async () => {
      const res = await request(app).post("/api/v1/auth/register").send(baseUser);

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        email: "cliente@correo.com",
        nombre: "Juan Pérez",
        rol: "cliente",
      });
      expect(res.body.user.id).toEqual(expect.any(String));
      expect(res.headers["set-cookie"]).toBeDefined();

      const cookies = (res.headers["set-cookie"] as unknown as string[]).join(";");
      expect(cookies).toContain(COOKIE_NAMES.access);
      expect(cookies).toContain(COOKIE_NAMES.refresh);
      expect(cookies).toContain("HttpOnly");

      const stored = await UserModel.findOne({ email: "cliente@correo.com" });
      expect(stored).not.toBeNull();
      expect(stored!.passwordHash).not.toBe("Clave123");
    });

    it("rechaza email duplicado con 409", async () => {
      await request(app).post("/api/v1/auth/register").send(baseUser);

      const res = await request(app).post("/api/v1/auth/register").send(baseUser);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("rechaza password débil con 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...baseUser, password: "corta" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.campos.length).toBeGreaterThan(0);
    });

    it("rechaza email inválido con 400", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...baseUser, email: "no-es-un-email" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/v1/auth/register").send(baseUser);
    });

    it("inicia sesión con credenciales correctas", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: baseUser.email, password: baseUser.password });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(baseUser.email);
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("rechaza contraseña incorrecta con 401", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: baseUser.email, password: "Incorrecta123" });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rechaza email inexistente con 401", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "nadie@correo.com", password: "Clave123" });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("renueva la sesión con refresh token válido", async () => {
      const registerRes = await request(app).post("/api/v1/auth/register").send(baseUser);
      const cookies = registerRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.body.user.email).toBe(baseUser.email);
    });

    it("rechaza refresh sin cookie con 401", async () => {
      const res = await request(app).post("/api/v1/auth/refresh");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("devuelve el perfil con access token en cookie", async () => {
      const registerRes = await request(app).post("/api/v1/auth/register").send(baseUser);

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", registerRes.headers["set-cookie"]);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        email: baseUser.email,
        rol: "cliente",
      });
    });

    it("rechaza sin token con 401", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rechaza token inválido con 401", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", `${COOKIE_NAMES.access}=token-invalido`);

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("limpia las cookies de sesión", async () => {
      const registerRes = await request(app).post("/api/v1/auth/register").send(baseUser);

      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", registerRes.headers["set-cookie"]);

      expect(res.status).toBe(200);
      const cookies = (res.headers["set-cookie"] as unknown as string[]).join(";");
      expect(cookies).toContain(`${COOKIE_NAMES.access}=;`);
      expect(cookies).toContain(`${COOKIE_NAMES.refresh}=;`);
    });
  });
});
