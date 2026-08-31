import { Router } from "express";
import { body } from "express-validator";
import { pagoController } from "../../controllers/pago.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /checkout:
 *   post:
 *     summary: Crear checkout de un paquete
 *     description: |
 *       Crea el pago pendiente y devuelve la URL de pago de ePayco.
 *       El webhook de ePayco confirma el pago y dispara el onboarding automático
 *       (creación de credenciales de cliente + proyecto con fecha de entrega congelada).
 *     tags: [Pagos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paqueteId, email]
 *             properties:
 *               paqueteId: { type: string, example: "66e0a1b2c3d4e5f6a7b8c9d0" }
 *               email: { type: string, format: email, example: "cliente@correo.com" }
 *     responses:
 *       201:
 *         description: Checkout creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 urlPago: { type: string, nullable: true }
 *                 pago: { $ref: '#/components/schemas/Pago' }
 *       404:
 *         description: Paquete no disponible
 *       400:
 *         description: Validación fallida
 */
router.post(
  "/checkout",
  body("paqueteId").isMongoId().withMessage("paqueteId inválido"),
  body("email").isEmail().withMessage("Email inválido").trim().toLowerCase(),
  validate,
  pagoController.crearCheckout.bind(pagoController),
);

/**
 * @swagger
 * /epayco/webhook:
 *   post:
 *     summary: Webhook de confirmación de ePayco
 *     description: |
 *       Recibe la confirmación de ePayco (form-urlencoded), valida la firma MD5 y,
 *       si el pago fue Aceptada, ejecuta el onboarding automático. Responde "ok".
 *     tags: [Pagos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               x_cust_id_cliente: { type: string }
 *               x_ref_payco: { type: string }
 *               x_transaction_id: { type: string }
 *               x_amount: { type: string }
 *               x_currency_code: { type: string }
 *               x_transaction_state: { type: string, example: "Aceptada" }
 *               x_signature: { type: string }
 *     responses:
 *       200:
 *         description: Webhook procesado ("ok")
 *       401:
 *         description: Firma inválida
 */
router.post(
  "/epayco/webhook",
  pagoController.procesarWebhook.bind(pagoController),
);

/**
 * @swagger
 * /pagos/mis-pagos:
 *   get:
 *     summary: Pagos del cliente autenticado
 *     tags: [Pagos]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de pagos del cliente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pagos: { type: array, items: { $ref: '#/components/schemas/Pago' } }
 *       401:
 *         description: No autenticado
 */
router.get(
  "/pagos/mis-pagos",
  authMiddleware,
  pagoController.listarMisPagos.bind(pagoController),
);

/**
 * @swagger
 * /pagos:
 *   get:
 *     summary: Todos los pagos (admin)
 *     tags: [Pagos]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de todos los pagos
 *       403:
 *         description: Requiere rol admin
 */
router.get(
  "/pagos",
  authMiddleware,
  requireRol("admin"),
  pagoController.listarTodos.bind(pagoController),
);

export default router;
