import { Router } from "express";
import { body, query } from "express-validator";
import { contactoController } from "../../controllers/contacto.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { buildLimiter } from "../../middlewares/rate-limit.middleware";

const contactoRateLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Demasiados mensajes enviados, espera un rato",
    },
  },
});

const router = Router();

/**
 * @swagger
 * /contacto:
 *   post:
 *     summary: Enviar mensaje de contacto
 *     description: |
 *       Formulario público de la vitrina. Guarda el mensaje, lo envía al
 *       correo interno de la agencia (nunca expuesto) y responde al usuario
 *       con un acuse automático. Campo honeypot "_website" para bots.
 *     tags: [Contacto]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, email, mensaje]
 *             properties:
 *               nombre: { type: string, minLength: 2, example: Juan Pérez }
 *               email: { type: string, format: email }
 *               asunto: { type: string, example: Cotización }
 *               mensaje: { type: string, minLength: 10 }
 *               _website: { type: string, description: Honeypot - dejar vacío }
 *     responses:
 *       201:
 *         description: Mensaje recibido y correos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje: { $ref: '#/components/schemas/Contacto' }
 *       400:
 *         description: Validación fallida o honeypot activado
 *       429:
 *         description: Demasiados mensajes (límite 5/hora)
 */
router.post(
  "/contacto",
  contactoRateLimiter,
  body("_website")
    .optional()
    .custom((v: unknown) => v === "" || v === undefined),
  body("nombre")
    .isString()
    .isLength({ min: 2, max: 80 })
    .withMessage("Nombre inválido")
    .trim(),
  body("email").isEmail().withMessage("Email inválido").trim().toLowerCase(),
  body("asunto").optional().isString().isLength({ max: 120 }).trim(),
  body("mensaje")
    .isString()
    .isLength({ min: 10, max: 4000 })
    .withMessage("El mensaje debe tener entre 10 y 4000 caracteres")
    .trim(),
  validate,
  contactoController.enviar.bind(contactoController),
);

/**
 * @swagger
 * /contacto/mensajes:
 *   get:
 *     summary: Historial de mensajes de contacto (admin)
 *     tags: [Contacto]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Mensajes paginados
 *       403:
 *         description: Requiere rol admin
 */
router.get(
  "/contacto/mensajes",
  authMiddleware,
  requireRol("admin"),
  query("pagina").optional().isInt({ min: 1 }),
  query("limite").optional().isInt({ min: 1, max: 100 }),
  validate,
  contactoController.listar.bind(contactoController),
);

export default router;
