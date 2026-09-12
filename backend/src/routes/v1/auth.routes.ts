import { Router } from "express";
import { body, param } from "express-validator";
import { authController } from "../../controllers/auth.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { authRateLimiter } from "../../middlewares/rate-limit.middleware";

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registro de cliente
 *     description: Crea un usuario con rol cliente y emite cookies de sesión (auto-login).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, nombre]
 *             properties:
 *               email: { type: string, format: email, example: cliente@correo.com }
 *               password: { type: string, minLength: 8, example: "Clave123" }
 *               nombre: { type: string, minLength: 2, example: "Juan Pérez" }
 *     responses:
 *       201:
 *         description: Cliente creado (cookies accessToken + refreshToken)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Validación fallida
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 *       409:
 *         description: Email ya registrado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 */
router.post(
  "/auth/register",
  authRateLimiter,
  body("email").isEmail().withMessage("Email inválido").trim().toLowerCase(),
  body("password")
    .isString()
    .withMessage("Contraseña obligatoria")
    .isLength({ min: 8, max: 72 })
    .withMessage("La contraseña debe tener entre 8 y 72 caracteres")
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage("La contraseña debe contener letras y números"),
  body("nombre")
    .isString()
    .withMessage("Nombre obligatorio")
    .isLength({ min: 2, max: 80 })
    .withMessage("El nombre debe tener entre 2 y 80 caracteres")
    .trim(),
  validate,
  authController.register.bind(authController),
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Inicio de sesión
 *     description: Valida credenciales y emite cookies httpOnly (access 15m, refresh 7d).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Sesión iniciada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Credenciales inválidas
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 */
/**
 * @swagger
 * /auth/forgot:
 *   post:
 *     summary: Solicitar restablecimiento de contraseña
 *     description: Envía un enlace temporal (30 min). No revela si la cuenta existe.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Solicitud procesada
 */
router.post(
  "/auth/forgot",
  body("email").isEmail().trim().toLowerCase(),
  validate,
  authController.solicitarRestablecimiento.bind(authController),
);

/**
 * @swagger
 * /auth/reset:
 *   post:
 *     summary: Restablecer contraseña con el token del correo
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Enlace expirado o inválido
 */
router.post(
  "/auth/reset",
  body("token").isString().notEmpty(),
  body("password")
    .isString()
    .isLength({ min: 8, max: 72 })
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage("La contraseña debe tener letras y números (mínimo 8)"),
  validate,
  authController.restablecerContrasena.bind(authController),
);

router.post(
  "/auth/login",
  authRateLimiter,
  body("email").isEmail().withMessage("Email inválido").trim().toLowerCase(),
  body("password").isString().notEmpty().withMessage("Contraseña obligatoria"),
  validate,
  authController.login.bind(authController),
);

/**
 * @swagger
 * /auth/verificar-email:
 *   post:
 *     summary: Confirmar el correo con el token del enlace
 *     description: |
 *       Verifica la cuenta creada en la cotización. El token llega por correo y
 *       es válido por 24 horas.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Correo verificado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Token inválido o expirado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 */
router.post(
  "/auth/verificar-email",
  authRateLimiter,
  body("token").isString().notEmpty().withMessage("Token requerido"),
  validate,
  authController.verificarEmail.bind(authController),
);

/**
 * @swagger
 * /auth/reenviar-verificacion:
 *   post:
 *     summary: Reenviar el correo de verificación
 *     description: Silencioso si la cuenta no existe o ya está verificada.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Solicitud procesada
 */
router.post(
  "/auth/reenviar-verificacion",
  authRateLimiter,
  body("email").isEmail().withMessage("Email inválido").trim().toLowerCase(),
  validate,
  authController.reenviarVerificacion.bind(authController),
);

/**
 * @swagger
 * /auth/usuarios/{id}/verificar:
 *   post:
 *     summary: Marcar un correo como verificado (solo admin)
 *     tags: [Auth]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuario verificado
 *       404:
 *         description: Usuario no encontrado
 */
router.post(
  "/auth/usuarios/:id/verificar",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId().withMessage("Id inválido"),
  validate,
  authController.verificarManual.bind(authController),
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar sesión
 *     description: Rota accessToken y refreshToken usando la cookie de refresco.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Tokens renovados (cookies reemitidas)
 *       401:
 *         description: Refresh token inválido o ausente
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 */
router.post("/auth/refresh", authController.refresh.bind(authController));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Limpia las cookies de sesión.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Sesión cerrada
 */
router.post("/auth/logout", authController.logout.bind(authController));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Perfil del usuario autenticado
 *     description: Requiere cookie accessToken (o Bearer token).
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: No autenticado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 */
router.get("/auth/me", authMiddleware, authController.me.bind(authController));

export default router;
