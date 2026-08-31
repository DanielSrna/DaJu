import { Router } from "express";
import { body } from "express-validator";
import { authController } from "../../controllers/auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
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
