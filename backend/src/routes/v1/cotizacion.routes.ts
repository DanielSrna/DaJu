import { Router } from "express";
import { body } from "express-validator";
import { cotizacionController } from "../../controllers/cotizacion.controller";
import {
  authMiddleware,
  requireEmailVerificado,
} from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { authRateLimiter } from "../../middlewares/rate-limit.middleware";

const router = Router();

/**
 * @swagger
 * /cotizaciones:
 *   post:
 *     summary: Cotizar un producto y abrir el entorno de planeación
 *     description: |
 *       Registra al cliente con el producto que le interesa y crea su entorno
 *       (proyecto o espacio) en estado `planeacion`. No cobra nada: la fase de
 *       planeación y diseño es completamente gratis. Envía el correo de
 *       verificación y deja la sesión iniciada.
 *     tags: [Cotizaciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               [email, nombre, primerApellido, fechaNacimiento, aceptaCondiciones, aceptaDatos]
 *             properties:
 *               tipoProducto:
 *                 type: string
 *                 enum: [paquete, plantilla, servicio]
 *                 example: paquete
 *               paqueteId: { type: string, example: "66e0a1b2c3d4e5f6a7b8c9d0" }
 *               productoId: { type: string, example: "66e0a1b2c3d4e5f6a7b8c9d1" }
 *               nombre: { type: string, example: "Ana" }
 *               segundoNombre: { type: string, example: "María" }
 *               primerApellido: { type: string, example: "Pérez" }
 *               segundoApellido: { type: string, example: "Gómez" }
 *               fechaNacimiento:
 *                 type: string
 *                 format: date
 *                 example: "1995-04-12"
 *                 description: Debe acreditar mayoría de edad (18+)
 *               aceptaCondiciones:
 *                 type: boolean
 *                 description: Aceptación del contrato de condiciones (obligatorio true)
 *               aceptaDatos:
 *                 type: boolean
 *                 description: Aceptación del contrato de manejo de datos (obligatorio true)
 *               email: { type: string, format: email, example: "cliente@correo.com" }
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Cliente123"
 *                 description: Obligatoria para cuentas nuevas; si el correo ya existe se valida
 *     responses:
 *       201:
 *         description: Entorno de planeación creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entorno:
 *                   type: object
 *                   properties:
 *                     tipo: { type: string, enum: [proyecto, espacio] }
 *                     id: { type: string }
 *                     tipoProducto: { type: string }
 *                     productoSlug: { type: string }
 *                     productoNombre: { type: string }
 *                     estado: { type: string, example: planeacion }
 *                 usuario: { $ref: '#/components/schemas/User' }
 *                 nuevo: { type: boolean }
 *       400:
 *         description: Validación fallida
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 *       401:
 *         description: Ya existe una cuenta con ese email (contraseña incorrecta)
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 *       404:
 *         description: Producto no disponible
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 */
router.post(
  "/cotizaciones",
  authRateLimiter,
  body("tipoProducto")
    .optional()
    .isIn(["paquete", "plantilla", "servicio"])
    .withMessage("tipoProducto inválido"),
  body("paqueteId")
    .optional()
    .custom(
      (v: unknown) =>
        v === undefined || v === "" || /^[a-f0-9]{24}$/.test(String(v)),
    )
    .withMessage("paqueteId inválido"),
  body("productoId")
    .optional()
    .custom(
      (v: unknown) =>
        v === undefined || v === "" || /^[a-f0-9]{24}$/.test(String(v)),
    )
    .withMessage("productoId inválido"),
  body("email").isEmail().withMessage("Email inválido").trim().toLowerCase(),
  body("nombre")
    .isString()
    .withMessage("El nombre es obligatorio")
    .isLength({ min: 2, max: 80 })
    .trim(),
  body("segundoNombre").optional().isString().isLength({ max: 80 }).trim(),
  body("primerApellido")
    .isString()
    .withMessage("El primer apellido es obligatorio")
    .isLength({ min: 2, max: 80 })
    .trim(),
  body("segundoApellido").optional().isString().isLength({ max: 80 }).trim(),
  body("fechaNacimiento")
    .isISO8601()
    .withMessage("La fecha de nacimiento es obligatoria (AAAA-MM-DD)"),
  body("aceptaCondiciones")
    .isBoolean()
    .custom((v: unknown) => v === true)
    .withMessage("Debes aceptar el contrato de condiciones del servicio"),
  body("aceptaDatos")
    .isBoolean()
    .custom((v: unknown) => v === true)
    .withMessage("Debes aceptar el contrato de manejo de datos personales"),
  body("password")
    .optional()
    .isString()
    .isLength({ min: 8, max: 72 })
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage("La contraseña debe tener letras y números (mínimo 8)"),
  validate,
  cotizacionController.crear.bind(cotizacionController),
);

/**
 * @swagger
 * /cotizaciones/cliente:
 *   post:
 *     summary: Adquirir otro producto con la sesión activa
 *     description: |
 *       Para clientes ya registrados y verificados: abre el entorno del nuevo
 *       producto en `planeacion` sin pedir registro, identidad ni contratos.
 *     tags: [Cotizaciones]
 *     security: [cookieAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipoProducto:
 *                 type: string
 *                 enum: [paquete, plantilla, servicio]
 *               paqueteId: { type: string }
 *               productoId: { type: string }
 *     responses:
 *       201:
 *         description: Entorno de planeación listo
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Correo sin verificar
 *       404:
 *         description: Producto no disponible
 */
router.post(
  "/cotizaciones/cliente",
  authMiddleware,
  requireEmailVerificado,
  body("tipoProducto")
    .optional()
    .isIn(["paquete", "plantilla", "servicio"])
    .withMessage("tipoProducto inválido"),
  body("paqueteId")
    .optional()
    .custom(
      (v: unknown) =>
        v === undefined || v === "" || /^[a-f0-9]{24}$/.test(String(v)),
    )
    .withMessage("paqueteId inválido"),
  body("productoId")
    .optional()
    .custom(
      (v: unknown) =>
        v === undefined || v === "" || /^[a-f0-9]{24}$/.test(String(v)),
    )
    .withMessage("productoId inválido"),
  validate,
  cotizacionController.crearComoCliente.bind(cotizacionController),
);

export default router;
