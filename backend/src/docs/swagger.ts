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
      { name: "Paquetes", description: "Catálogo de productos (vitrina)" },
      { name: "Pagos", description: "Checkout directo ePayco y webhooks" },
      {
        name: "Proyectos",
        description: "Centro de proyectos + gestor de capacidad",
      },
      { name: "Briefing", description: "Documento maestro del proyecto" },
      { name: "Contacto", description: "Formulario público de contacto" },
      {
        name: "CMS",
        description: "Micro-CMS: logo, colores, marquesina y carrusel",
      },
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
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "66e0a1b2c3d4e5f6a7b8c9d0" },
            email: {
              type: "string",
              format: "email",
              example: "cliente@correo.com",
            },
            nombre: { type: "string", example: "Juan Pérez" },
            rol: { type: "string", enum: ["admin", "cliente"] },
          },
        },
        Paquete: {
          type: "object",
          properties: {
            id: { type: "string" },
            nombre: { type: "string", example: "Paquete Operativo" },
            slug: { type: "string", example: "operativo" },
            tipo: {
              type: "string",
              enum: ["validor", "corporativo", "operativo"],
            },
            descripcion: { type: "string" },
            precio: { type: "number", example: 999 },
            moneda: { type: "string", example: "USD" },
            vistasIncluidas: { type: "number", example: 1 },
            soporteMeses: { type: "number", example: 12 },
            diasEntrega: { type: "number", example: 30 },
            features: { type: "array", items: { type: "string" } },
            activo: { type: "boolean", example: true },
          },
        },
        PaqueteInput: {
          type: "object",
          required: [
            "nombre",
            "slug",
            "tipo",
            "descripcion",
            "precio",
            "vistasIncluidas",
            "soporteMeses",
            "diasEntrega",
          ],
          properties: {
            nombre: { type: "string", example: "Paquete Operativo" },
            slug: { type: "string", example: "operativo" },
            tipo: {
              type: "string",
              enum: ["validor", "corporativo", "operativo"],
            },
            descripcion: { type: "string" },
            precio: { type: "number", example: 999 },
            moneda: { type: "string", example: "USD" },
            vistasIncluidas: { type: "number" },
            soporteMeses: { type: "number" },
            diasEntrega: { type: "number" },
            features: { type: "array", items: { type: "string" } },
            activo: { type: "boolean" },
          },
        },
        Pago: {
          type: "object",
          properties: {
            id: { type: "string" },
            paqueteSlug: { type: "string", example: "operativo" },
            descripcion: { type: "string" },
            monto: { type: "number", example: 999 },
            moneda: { type: "string", example: "USD" },
            emailCliente: { type: "string", format: "email" },
            estado: {
              type: "string",
              enum: ["pending", "paid", "failed", "refunded"],
            },
            referencia: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Proyecto: {
          type: "object",
          properties: {
            id: { type: "string" },
            clienteId: { type: "string" },
            paquete: {
              type: "object",
              properties: {
                slug: { type: "string" },
                nombre: { type: "string" },
                tipo: {
                  type: "string",
                  enum: ["validor", "corporativo", "operativo"],
                },
                vistasIncluidas: { type: "number" },
                soporteMeses: { type: "number" },
                diasEntrega: { type: "number" },
              },
            },
            estado: {
              type: "string",
              enum: ["recibido", "diseno", "desarrollo", "entregado"],
            },
            fechaCompra: { type: "string", format: "date-time" },
            fechaEntrega: { type: "string", format: "date-time" },
          },
        },
        Briefing: {
          type: "object",
          properties: {
            id: { type: "string" },
            proyectoId: { type: "string" },
            contenido: {
              type: "object",
              properties: {
                empresa: { type: "string" },
                descripcionNegocio: { type: "string" },
                objetivos: { type: "string" },
                textos: { type: "object" },
                requerimientos: { type: "string" },
                extras: { type: "object" },
              },
            },
            archivos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  publicId: { type: "string" },
                  url: { type: "string" },
                  nombre: { type: "string" },
                  mimeType: { type: "string" },
                  tamañoBytes: { type: "number" },
                  tipo: {
                    type: "string",
                    enum: ["logo", "imagen", "pdf", "otro"],
                  },
                },
              },
            },
            completado: { type: "boolean" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Contacto: {
          type: "object",
          properties: {
            id: { type: "string" },
            nombre: { type: "string" },
            email: { type: "string", format: "email" },
            asunto: { type: "string" },
            mensaje: { type: "string" },
            estado: {
              type: "string",
              enum: ["recibido", "respondido", "archivado"],
            },
            enviadoAdmin: { type: "boolean" },
            acuseEnviado: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CmsPublico: {
          type: "object",
          properties: {
            logo: {
              type: "object",
              nullable: true,
              properties: {
                url: { type: "string" },
                publicId: { type: "string" },
              },
            },
            colores: {
              type: "object",
              properties: {
                primario: { type: "string" },
                secundario: { type: "string" },
                acento: { type: "string" },
              },
            },
            marquesina: {
              type: "object",
              properties: {
                texto: { type: "string" },
                activo: { type: "boolean" },
              },
            },
            carrusel: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  imagen: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                      publicId: { type: "string" },
                    },
                  },
                  link: { type: "string" },
                  titulo: { type: "string" },
                  activo: { type: "boolean" },
                  orden: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/**/*.routes.ts", "./src/docs/**/*.yaml"],
};

export const swaggerSpec = swaggerJsdoc(options);
