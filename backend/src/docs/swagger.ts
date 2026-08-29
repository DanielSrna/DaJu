import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "MainPlataform API",
      version: "0.1.0",
      description:
        "API oficial de MainPlataform. Este documento es EL CONTRATO entre la API y sus clientes. " +
        "Todo endpoint debe estar documentado aquí antes de considerarse terminado.",
    },
    servers: [{ url: "/api/v1", description: "Prefijo versionado" }],
    tags: [
      { name: "Health", description: "Estado del servicio" },
      { name: "Auth", description: "Autenticación y RBAC" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description: "JWT en cookie httpOnly (accessToken)",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ApiError: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string", example: "Descripción del error" },
                details: {
                  type: "object",
                  description: "Detalles adicionales (opcional)",
                },
              },
              required: ["code", "message"],
            },
          },
          required: ["error"],
        },
        HealthStatus: {
          type: "object",
          properties: {
            estado: { type: "string", example: "ok" },
            uptime: { type: "number", example: 123.45 },
            timestamp: { type: "string", example: "2026-08-29T00:00:00.000Z" },
            version: { type: "string", example: "0.1.0" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/**/*.routes.ts", "./src/docs/**/*.yaml"],
};

export const swaggerSpec = swaggerJsdoc(options);
