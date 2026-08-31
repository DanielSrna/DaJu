import { swaggerSpec } from "../src/docs/swagger";

interface OpenApiSpec {
  paths: Record<string, Record<string, unknown>>;
  info?: Record<string, unknown>;
  components?: { schemas?: Record<string, unknown> };
  [key: string]: unknown;
}

const spec = swaggerSpec as unknown as OpenApiSpec;

function recolectarRefs(obj: unknown, refs: string[]): void {
  if (Array.isArray(obj)) {
    obj.forEach((item) => recolectarRefs(item, refs));
    return;
  }
  if (obj && typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    if (typeof record["$ref"] === "string") {
      refs.push(record["$ref"]);
    }
    Object.values(record).forEach((value) => recolectarRefs(value, refs));
  }
}

describe("Integridad del spec Swagger/OpenAPI", () => {
  it("el spec es un documento OpenAPI válido", () => {
    expect(spec.openapi).toBe("3.0.3");
    expect(spec.info?.["title"]).toBe("MainPlataform API");
    expect(spec.paths).toBeDefined();
  });

  it("contiene los paths principales de todos los módulos", () => {
    const rutas = Object.keys(spec.paths);
    const esperadas = [
      "/health",
      "/auth/register",
      "/auth/login",
      "/auth/refresh",
      "/auth/logout",
      "/auth/me",
      "/paquetes",
      "/paquetes/{slug}",
      "/paquetes/admin",
      "/paquetes/{id}/imagen",
      "/paquetes/{id}/galeria",
      "/checkout",
      "/epayco/webhook",
      "/pagos",
      "/pagos/mis-pagos",
      "/proyectos",
      "/proyectos/admin",
      "/proyectos/{id}",
      "/proyectos/{id}/estado",
      "/proyectos/{id}/garantia",
      "/capacidad",
      "/briefing/{proyectoId}",
      "/briefing/{proyectoId}/archivos",
      "/briefing/{proyectoId}/archivos/{archivoId}",
      "/contacto",
      "/contacto/mensajes",
      "/cms",
      "/cms/identidad",
      "/cms/marquesina",
      "/cms/carrusel",
      "/cms/carrusel/{id}",
    ];
    for (const esperada of esperadas) {
      expect(rutas).toContain(esperada);
    }
  });

  it("cada operación documentada tiene responses", () => {
    const sinResponses: string[] = [];
    for (const [path, operations] of Object.entries(spec.paths)) {
      for (const [metodo, operacion] of Object.entries(operations)) {
        if (!["get", "post", "put", "delete", "patch"].includes(metodo)) continue;
        const op = operacion as { responses?: unknown };
        if (!op.responses) {
          sinResponses.push(`${metodo.toUpperCase()} ${path}`);
        }
      }
    }
    expect(sinResponses).toEqual([]);
  });

  it("todas las referencias $ref apuntan a schemas existentes", () => {
    const refs: string[] = [];
    recolectarRefs(spec, refs);

    const schemas = spec.components?.schemas ?? {};
    const invalidas: string[] = [];
    for (const ref of refs) {
      const match = /^#\/components\/schemas\/(.+)$/.exec(ref);
      if (!match || schemas[match[1]] === undefined) {
        invalidas.push(ref);
      }
    }
    expect(invalidas).toEqual([]);
  });

  it("los schemas definidos del dominio existen", () => {
    const schemas = spec.components?.schemas ?? {};
    const nombres = [
      "User",
      "Paquete",
      "PaqueteInput",
      "Pago",
      "Proyecto",
      "Briefing",
      "Contacto",
      "CmsPublico",
      "ApiError",
      "HealthStatus",
    ];
    for (const nombre of nombres) {
      expect(schemas[nombre]).toBeDefined();
    }
  });
});
